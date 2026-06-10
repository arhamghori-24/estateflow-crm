/**
 * Twilio status callbacks: update call duration, recording URL, and outcome.
 * Twilio sends application/x-www-form-urlencoded.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { callService } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  const role = url.searchParams.get("role");
  if (!callId) return new NextResponse("missing callId", { status: 400 });

  const form = await req.formData();
  const CallStatus = String(form.get("CallStatus") ?? "");
  const CallDuration = String(form.get("CallDuration") ?? "0");
  const RecordingUrl = form.get("RecordingUrl") ? String(form.get("RecordingUrl")) : null;

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (CallStatus === "completed") {
    updates.status = "completed";
    updates.outcome = "connected";
    updates.duration_seconds = parseInt(CallDuration, 10) || 0;
    updates.ended_at = new Date().toISOString();
    if (RecordingUrl) updates.recording_url = `${RecordingUrl}.mp3`;
  } else if (CallStatus === "no-answer") {
    updates.status = "no_answer";
    updates.outcome = "no_answer";
    updates.ended_at = new Date().toISOString();
  } else if (CallStatus === "failed") {
    updates.status = "failed";
    updates.ended_at = new Date().toISOString();
  } else if (CallStatus === "busy") {
    updates.status = "busy";
    updates.outcome = "no_answer";
    updates.ended_at = new Date().toISOString();
  }

  if (Object.keys(updates).length) {
    await admin.from("calls").update(updates).eq("id", callId);

    // If the AGENT leg failed/no-answer, escalate to next agent
    if (role === "agent" && (CallStatus === "no-answer" || CallStatus === "failed" || CallStatus === "busy")) {
      const { data: c } = await admin.from("calls").select("organization_id, lead_id").eq("id", callId).single();
      if (c) await callService.tryNextAgent(callId, c.organization_id, c.lead_id);
    }

    if (CallStatus === "completed") {
      const { data: c } = await admin.from("calls").select("organization_id, lead_id, duration_seconds").eq("id", callId).single();
      if (c) {
        await admin.from("activities").insert({
          organization_id: c.organization_id,
          type: "call_ended",
          lead_id: c.lead_id,
          call_id: callId,
          summary: `Call ended (${c.duration_seconds ?? 0}s)`,
        });
        await admin.from("leads").update({ last_contacted_at: new Date().toISOString(), status: "contacted" }).eq("id", c.lead_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
