/**
 * callService - Agent-to-Lead Bridge Call via Twilio Voice.
 *
 * Flow:
 *   1. We call the assigned agent first.
 *   2. Agent answers -> Twilio plays a prompt -> agent presses any digit.
 *   3. We then dial the lead and bridge both into a conference.
 *
 * In dry-run mode the entire flow is simulated and logged to the calls table.
 *
 * Webhook callbacks (from Twilio) are handled in:
 *   app/api/twilio/voice/route.ts   (agent leg TwiML)
 *   app/api/twilio/bridge/route.ts  (lead leg + conference TwiML)
 *   app/api/twilio/status/route.ts  (status callbacks)
 */
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/server";
import { isDryRun } from "@/lib/utils";
import type { CallBridgeRequest, ServiceResult } from "./types";

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export const callService = {
  /**
   * Initiates the bridge call.
   * Returns immediately after kicking off the agent leg; the rest is driven by Twilio webhooks.
   */
  async initiateBridge(req: CallBridgeRequest): Promise<ServiceResult<{ callId: string }>> {
    const supabase = createAdminClient();
    const dryRun = isDryRun() || !process.env.TWILIO_ACCOUNT_SID;

    // 1. Create call record
    const { data: call, error } = await supabase
      .from("calls")
      .insert({
        organization_id: req.organizationId,
        lead_id: req.leadId,
        agent_id: req.agentId,
        status: "initiated",
        is_dry_run: dryRun,
      })
      .select("id")
      .single();
    if (error || !call) return { ok: false, dryRun, error: error?.message ?? "DB insert failed" };

    // 2. Activity log
    await supabase.from("activities").insert({
      organization_id: req.organizationId,
      actor_id: req.agentId,
      type: "call_started",
      lead_id: req.leadId,
      call_id: call.id,
      summary: `Bridge call initiated for ${req.leadName}`,
      metadata: { source: req.source, dry_run: dryRun },
    });

    if (dryRun) {
      // Simulate: mark as completed after a moment with a fake outcome.
      console.log(`[callService:dry-run] Would call agent ${req.agentPhone} then bridge to lead ${req.leadPhone}`);
      await supabase
        .from("calls")
        .update({
          status: "completed",
          outcome: "connected",
          duration_seconds: 42,
          ended_at: new Date().toISOString(),
        })
        .eq("id", call.id);
      await supabase.from("activities").insert({
        organization_id: req.organizationId,
        actor_id: req.agentId,
        type: "call_ended",
        lead_id: req.leadId,
        call_id: call.id,
        summary: `[DRY-RUN] Call completed - 42s`,
      });
      return { ok: true, dryRun: true, data: { callId: call.id } };
    }

    // 3. Real Twilio leg 1: dial agent
    const client = getTwilioClient();
    if (!client) return { ok: false, dryRun: false, error: "Twilio not configured" };
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

    try {
      const agentCall = await client.calls.create({
        to: req.agentPhone,
        from: fromNumber,
        url: `${baseUrl}/api/twilio/voice?callId=${call.id}&role=agent`,
        statusCallback: `${baseUrl}/api/twilio/status?callId=${call.id}&role=agent`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        timeout: 25,
      });

      await supabase
        .from("calls")
        .update({ agent_call_sid: agentCall.sid, status: "ringing_agent" })
        .eq("id", call.id);

      return { ok: true, dryRun: false, data: { callId: call.id } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown twilio error";
      await supabase.from("calls").update({ status: "failed", notes: msg }).eq("id", call.id);
      return { ok: false, dryRun: false, error: msg };
    }
  },

  /** When the agent leg fails, try the next available agent. */
  async tryNextAgent(callId: string, organizationId: string, leadId: string): Promise<ServiceResult> {
    const supabase = createAdminClient();
    // Find next active agent not the same as the one that just failed
    const { data: call } = await supabase.from("calls").select("agent_id").eq("id", callId).single();
    const failedAgentId = call?.agent_id;

    const { data: nextAgents } = await supabase
      .from("profiles")
      .select("id, phone")
      .eq("organization_id", organizationId)
      .eq("role", "sales_agent")
      .eq("is_active", true)
      .neq("id", failedAgentId ?? "")
      .limit(1);

    if (!nextAgents || nextAgents.length === 0) {
      // No more agents - mark lead as call_pending and notify manager
      await supabase.from("leads").update({ status: "call_pending" }).eq("id", leadId);
      await supabase.from("followups").insert({
        organization_id: organizationId,
        lead_id: leadId,
        type: "call",
        title: "Manual callback needed - no agent answered",
        due_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        status: "pending",
      });
      const { data: managers } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", organizationId)
        .in("role", ["admin", "sales_manager"]);
      if (managers?.length) {
        await supabase.from("notifications").insert(
          managers.map((m) => ({
            organization_id: organizationId,
            user_id: m.id,
            kind: "missed_call",
            title: "No agent answered new lead",
            body: "Lead has been marked Call Pending. Please follow up.",
            link_path: `/leads/${leadId}`,
          }))
        );
      }
      return { ok: true, dryRun: false, data: { exhausted: true } };
    }

    const next = nextAgents[0];
    await supabase.from("calls").update({ agent_id: next.id }).eq("id", callId);
    // Retry. In production you'd kick off a new agent leg here.
    return { ok: true, dryRun: false, data: { nextAgentId: next.id } };
  },
};
