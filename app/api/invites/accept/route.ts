/** Accepts an invite token: creates auth user (if needed), profile, marks invite accepted. */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { token, fullName, phone, password } = parsed.data;

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (!invite) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });

  // Create or find auth user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin.auth as any).admin.listUsers({ page: 1, perPage: 100 });
  let userId: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const found = existing?.users?.find((u: any) => u.email === invite.email);
  if (found) userId = found.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: invite.email, password, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Auth create failed" }, { status: 500 });
    userId = data.user.id;
  }

  // Create profile
  await admin.from("profiles").upsert({
    id: userId, organization_id: invite.organization_id,
    full_name: fullName, email: invite.email, phone, role: invite.role,
  });

  await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  return NextResponse.json({ ok: true });
}
