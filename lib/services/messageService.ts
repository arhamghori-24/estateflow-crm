/**
 * messageService - send WhatsApp / SMS via Twilio.
 * Email is delegated to emailService.
 * In dry-run mode, messages are persisted with is_dry_run=true and never sent externally.
 */
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/server";
import { isDryRun } from "@/lib/utils";
import { emailService } from "./emailService";
import type { MessageRequest, ServiceResult } from "./types";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export const messageService = {
  async send(req: MessageRequest): Promise<ServiceResult<{ messageId: string }>> {
    const supabase = createAdminClient();
    const dryRun = isDryRun() || !process.env.TWILIO_ACCOUNT_SID;

    if (req.channel === "email") {
      return emailService.send({
        organizationId: req.organizationId,
        leadId: req.leadId,
        sentBy: req.sentBy,
        to: req.to,
        subject: req.subject ?? "From EstateFlow CRM",
        body: req.body,
        templateKey: req.templateKey,
      });
    }

    // Persist queued message
    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        organization_id: req.organizationId,
        lead_id: req.leadId,
        sent_by: req.sentBy ?? null,
        channel: req.channel,
        direction: "outbound",
        body: req.body,
        template_key: req.templateKey,
        status: "queued",
        is_dry_run: dryRun,
      })
      .select("id")
      .single();
    if (error || !msg) return { ok: false, dryRun, error: error?.message ?? "insert failed" };

    if (dryRun) {
      console.log(`[messageService:dry-run] ${req.channel} -> ${req.to}: ${req.body.slice(0, 80)}`);
      await supabase.from("messages").update({ status: "sent" }).eq("id", msg.id);
      await supabase.from("activities").insert({
        organization_id: req.organizationId,
        actor_id: req.sentBy ?? null,
        type: "message_sent",
        lead_id: req.leadId,
        message_id: msg.id,
        summary: `[DRY-RUN] ${req.channel.toUpperCase()} sent to ${req.to}`,
      });
      return { ok: true, dryRun: true, data: { messageId: msg.id } };
    }

    const client = getClient();
    if (!client) return { ok: false, dryRun: false, error: "Twilio not configured" };

    try {
      const from = req.channel === "whatsapp"
        ? process.env.TWILIO_WHATSAPP_NUMBER!
        : process.env.TWILIO_PHONE_NUMBER!;
      const to = req.channel === "whatsapp"
        ? (req.to.startsWith("whatsapp:") ? req.to : `whatsapp:${req.to}`)
        : req.to;

      const sent = await client.messages.create({ from, to, body: req.body });

      await supabase
        .from("messages")
        .update({ status: "sent", external_id: sent.sid })
        .eq("id", msg.id);
      await supabase.from("activities").insert({
        organization_id: req.organizationId,
        actor_id: req.sentBy ?? null,
        type: "message_sent",
        lead_id: req.leadId,
        message_id: msg.id,
        summary: `${req.channel.toUpperCase()} sent to ${req.to}`,
      });
      return { ok: true, dryRun: false, data: { messageId: msg.id } };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "send failed";
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: errMsg })
        .eq("id", msg.id);
      return { ok: false, dryRun: false, error: errMsg };
    }
  },
};
