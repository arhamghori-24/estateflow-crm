/** Creates the organization, integration settings, and profile for a new signup. */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  orgName: z.string().min(2),
  fullName: z.string().min(2),
  phone: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { userId, email, orgName, fullName, phone } = parsed.data;

  const admin = createAdminClient();

  // Idempotency: if profile already exists, do nothing
  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, alreadyExists: true });

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "org";
  const slugUnique = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, slug: slugUnique, email, phone })
    .select("id")
    .single();
  if (orgErr || !org) return NextResponse.json({ error: orgErr?.message }, { status: 500 });

  const { error: profErr } = await admin.from("profiles").insert({
    id: userId, organization_id: org.id, full_name: fullName, email, phone, role: "admin",
  });
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  await admin.from("integration_settings").insert({ organization_id: org.id, default_assignment_mode: "round_robin" });

  return NextResponse.json({ ok: true, orgId: org.id });
}
