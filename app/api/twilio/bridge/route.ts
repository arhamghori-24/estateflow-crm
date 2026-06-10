/**
 * Twilio Voice webhook (bridge).
 *
 * Triggered by <Gather> action from the agent leg once they press a digit.
 * - Agent is sent into a conference room.
 * - We separately dial the lead and connect them to the same conference.
 */
import { NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const { VoiceResponse } = twilio.twiml;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) return new NextResponse("missing callId", { status: 400 });

  const admin = createAdminClient();
  const { data: call } = await admin
    .from("calls").select("*, leads(phone)").eq("id", callId).single();
  if (!call) return new NextResponse("call not found", { status: 404 });

  const conferenceName = `bridge-${callId}`;

  // Put agent in conference (TwiML response)
  const twiml = new VoiceResponse();
  twiml.say({ voice: "alice" }, "Connecting you to the lead now.");
  const dial = twiml.dial();
  dial.conference({
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    record: "record-from-start",
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status?callId=${callId}&leg=conf`,
    statusCallbackEvent: ["start", "end", "join", "leave"],
  }, conferenceName);

  // Place the second outbound call to the lead, also routed to the same conference
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadPhone = (call.leads as any)?.phone;
  if (accountSid && authToken && leadPhone) {
    const client = twilio(accountSid, authToken);
    try {
      const leadCall = await client.calls.create({
        to: leadPhone,
        from: process.env.TWILIO_PHONE_NUMBER!,
        twiml: `<Response><Say voice="alice">Connecting you to your real estate agent now.</Say>
          <Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true">${conferenceName}</Conference></Dial>
        </Response>`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status?callId=${callId}&role=lead`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });
      await admin
        .from("calls")
        .update({ lead_call_sid: leadCall.sid, status: "ringing_lead", conference_sid: conferenceName })
        .eq("id", callId);
    } catch (e) {
      console.error("[twilio/bridge] failed to dial lead:", e);
    }
  }

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
