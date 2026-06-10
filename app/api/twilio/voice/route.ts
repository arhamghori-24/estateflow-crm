/**
 * Twilio Voice webhook (agent leg).
 *
 * Twilio calls this URL when our outbound dial to the agent connects.
 * We return TwiML that:
 *   1. Plays a short prompt: "New real estate lead from {{source}}. Press any key to connect."
 *   2. On any digit, sends agent into a Conference room (named after the callId).
 *   3. Simultaneously, kicks off the lead leg that also joins the same conference.
 */
import { NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/server";
import { validateTwilioRequest } from "@/lib/twilio";

export const runtime = "nodejs";
const { VoiceResponse } = twilio.twiml;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) return new NextResponse("missing callId", { status: 400 });

  const { valid } = await validateTwilioRequest(req, await req.formData());
  if (!valid) return new NextResponse("invalid signature", { status: 403 });

  const admin = createAdminClient();
  const { data: call } = await admin
    .from("calls")
    .select("id, lead_id, agent_id, leads(full_name, phone, source)")
    .eq("id", callId)
    .single();

  const twiml = new VoiceResponse();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead: any = call?.leads;
  const source = (lead?.source ?? "a portal").replace(/_/g, " ");
  const name = lead?.full_name ?? "the new lead";

  twiml.say({ voice: "alice" },
    `Hello. New real estate lead from ${source}. The lead's name is ${name}. Press any key to connect.`);
  const gather = twiml.gather({
    numDigits: 1,
    timeout: 10,
    action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/bridge?callId=${callId}`,
    method: "POST",
  });
  gather.say("Press any key to connect.");
  twiml.say("No input received. Goodbye.");
  twiml.hangup();

  await admin.from("calls").update({ status: "agent_connected" }).eq("id", callId);

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
