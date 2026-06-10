/**
 * Cron: send "follow-up due" notifications.
 * Schedule with Vercel Cron (see vercel.json) or any external scheduler.
 * Header required:  Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const horizon = new Date(Date.now() + 30 * 60_000).toISOString();
  const { data: due } = await admin
    .from("followups")
    .select("id, organization_id, assigned_to, title, lead_id, due_at")
    .eq("status", "pending")
    .lte("due_at", horizon);

  let created = 0;
  for (const f of due ?? []) {
    if (!f.assigned_to) continue;
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", f.assigned_to)
      .eq("kind", "followup_due")
      .eq("metadata->>followup_id", f.id)
      .maybeSingle();
    if (existing) continue;

    await admin.from("notifications").insert({
      organization_id: f.organization_id,
      user_id: f.assigned_to,
      kind: "followup_due",
      title: "Follow-up due soon",
      body: f.title,
      link_path: `/leads/${f.lead_id}`,
      metadata: { followup_id: f.id },
    });
    created++;
  }

  return NextResponse.json({ ok: true, processed: due?.length ?? 0, created });
}
