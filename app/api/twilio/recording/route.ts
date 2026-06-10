/** Twilio recording callback - persists the recording URL on the call. */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validateTwilioRequest } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) return new NextResponse("missing callId", { status: 400 });

  const { valid, params } = await validateTwilioRequest(req, await req.formData());
  if (!valid) return new NextResponse("invalid signature", { status: 403 });

  const recording = params.RecordingUrl;
  if (!recording) return NextResponse.json({ ok: true });
  const admin = createAdminClient();
  await admin.from("calls").update({ recording_url: `${recording}.mp3` }).eq("id", callId);
  return NextResponse.json({ ok: true });
}
