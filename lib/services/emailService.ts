/** emailService - Resend adapter with dry-run mode. */
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { isDryRun } from "@/lib/utils";
import type { ServiceResult } from "./types";

interface EmailRequest {
  organizationId: string;
  leadId: string;
  sentBy?: string;
  to: string;
  subject: string;
  body: string;
  templateKey?: string;
}

export const emailService = {
  async send(req: EmailRequest): Promise<ServiceResult<{ messageId: string }>> {
    const supabase = createAdminClient();
    const apiKey = process.env.RESEND_API_KEY;
    const dryRun = isDryRun() || !apiKey;

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        organization_id: req.organizationId,
        lead_id: req.leadId,
        sent_by: req.sentBy ?? null,
        channel: "email",
        direction: "outbound",
        body: `Subject: ${req.subject}\n\n${req.body}`,
        template_key: req.templateKey,
        status: "queued",
        is_dry_run: dryRun,
      })
      .select("id")
      .single();
    if (error || !msg) return { ok: false, dryRun, error: error?.message };

    if (dryRun) {
      console.log(`[emailService:dry-run] -> ${req.to} | ${req.subject}`);
      await supabase.from("messages").update({ status: "sent" }).eq("id", msg.id);
      return { ok: true, dryRun: true, data: { messageId: msg.id } };
    }

    try {
      const resend = new Resend(apiKey);
      const { data, error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "EstateFlow <noreply@estateflow.app>",
        to: req.to,
        subject: req.subject,
        text: req.body,
      });
      if (sendErr) throw new Error(sendErr.message);

      await supabase
        .from("messages")
        .update({ status: "sent", external_id: data?.id })
        .eq("id", msg.id);
      return { ok: true, dryRun: false, data: { messageId: msg.id } };
    } catch (e) {
      const err = e instanceof Error ? e.message : "email failed";
      await supabase.from("messages").update({ status: "failed", error_message: err }).eq("id", msg.id);
      return { ok: false, dryRun: false, error: err };
    }
  },
};
