/** Twilio recording callback - persists the recording URL on the call. */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) return new NextResponse("missing callId", { status: 400 });
  const form = await req.formData();
  const recording = form.get("RecordingUrl");
  if (!recording) return NextResponse.json({ ok: true });
  const admin = createAdminClient();
  await admin.from("calls").update({ recording_url: `${String(recording)}.mp3` }).eq("id", callId);
  return NextResponse.json({ ok: true });
}
