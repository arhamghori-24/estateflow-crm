/**
 * propertyShareService - shares property details with a lead and logs to timeline.
 * Generates a public share URL and dispatches via messageService.
 */
import { createAdminClient } from "@/lib/supabase/server";
import { messageService } from "./messageService";
import { formatCurrency } from "@/lib/utils";
import type { ServiceResult } from "./types";

interface ShareRequest {
  organizationId: string;
  leadId: string;
  propertyId: string;
  sharedBy: string;
  channel: "whatsapp" | "sms" | "email";
  customMessage?: string;
}

export const propertyShareService = {
  async share(req: ShareRequest): Promise<ServiceResult<{ shareUrl: string; messageId?: string }>> {
    const supabase = createAdminClient();

    const [{ data: lead }, { data: property }] = await Promise.all([
      supabase.from("leads").select("full_name, phone, email").eq("id", req.leadId).single(),
      supabase
        .from("properties")
        .select("title, location, price, share_token, property_images(url)")
        .eq("id", req.propertyId)
        .single(),
    ]);

    if (!lead || !property) return { ok: false, dryRun: false, error: "Lead or property not found" };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/property/${property.share_token}`;

    const messageBody =
      req.customMessage ??
      `Hi ${lead.full_name}, sharing details of ${property.title} in ${property.location}. Price: ${formatCurrency(property.price)}. Photos and details: ${shareUrl}`;

    // Persist share record
    await supabase.from("lead_property_shares").insert({
      organization_id: req.organizationId,
      lead_id: req.leadId,
      property_id: req.propertyId,
      shared_by: req.sharedBy,
      channel: req.channel,
      message_body: messageBody,
      share_url: shareUrl,
    });

    await supabase.from("activities").insert({
      organization_id: req.organizationId,
      actor_id: req.sharedBy,
      type: "property_shared",
      lead_id: req.leadId,
      property_id: req.propertyId,
      summary: `Shared "${property.title}" via ${req.channel}`,
    });

    // Send via channel
    const to = req.channel === "email" ? (lead.email ?? "") : lead.phone;
    if (!to) {
      return { ok: false, dryRun: false, error: `Lead has no ${req.channel} contact` };
    }

    const sendResult = await messageService.send({
      organizationId: req.organizationId,
      leadId: req.leadId,
      sentBy: req.sharedBy,
      channel: req.channel,
      to,
      body: messageBody,
      subject: `Property suggestion: ${property.title}`,
      templateKey: "property_share",
    });

    return { ok: sendResult.ok, dryRun: sendResult.dryRun, data: { shareUrl, messageId: sendResult.data?.messageId } };
  },
};
