"use server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  leadCreateSchema, followupCreateSchema, messageSendSchema,
  propertyCreateSchema, socialPostSchema, inviteCreateSchema,
  attendanceCheckInSchema, integrationSettingsSchema,
} from "@/lib/validation/schemas";
import {
  callService, messageService, propertyShareService,
  leadAssignmentService, attendanceService, socialPostService,
} from "@/lib/services";
import type { LeadStatus, UserRole } from "@/lib/types/database";

// ===================== LEAD ACTIONS =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createLead(input: any) {
  const { profile } = await requireUser();
  const parsed = leadCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };

  const supabase = await createClient();
  // Assign agent if not provided
  let assigned = parsed.data.assigned_agent_id;
  if (!assigned) assigned = (await leadAssignmentService.pickAgent(profile.organization_id)) ?? null;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...parsed.data,
      assigned_agent_id: assigned,
      organization_id: profile.organization_id,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    type: "lead_created",
    lead_id: data.id,
    summary: `Lead "${parsed.data.full_name}" created`,
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) return { error: error.message };
  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    actor_id: profile.id, type: "lead_status_changed", lead_id: leadId,
    summary: `Status changed to ${status}`,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function assignLead(leadId: string, agentId: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  await supabase.from("leads").update({ assigned_agent_id: agentId }).eq("id", leadId);
  const { data: agent } = await supabase.from("profiles").select("full_name").eq("id", agentId).single();
  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    actor_id: profile.id, type: "lead_assigned", lead_id: leadId,
    summary: `Reassigned to ${agent?.full_name ?? "agent"}`,
  });
  await supabase.from("notifications").insert({
    organization_id: profile.organization_id, user_id: agentId,
    kind: "new_lead", title: "New lead assigned to you", link_path: `/leads/${leadId}`,
  });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function setLeadTemperature(leadId: string, temperature: "hot" | "warm" | "cold") {
  const { profile } = await requireUser();
  const supabase = await createClient();
  await supabase.from("leads").update({ temperature }).eq("id", leadId);
  await supabase.from("activities").insert({
    organization_id: profile.organization_id, actor_id: profile.id, type: "lead_note_added",
    lead_id: leadId, summary: `Temperature set to ${temperature}`,
  });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function addLeadNote(leadId: string, note: string) {
  const { profile } = await requireUser();
  if (!note.trim()) return { error: "Note is empty" };
  const supabase = await createClient();
  await supabase.from("activities").insert({
    organization_id: profile.organization_id, actor_id: profile.id,
    type: "lead_note_added", lead_id: leadId, summary: note.trim(),
  });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

// ===================== CALL ACTIONS =====================
export async function triggerBridgeCall(leadId: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, phone, source, assigned_agent_id, agent:assigned_agent_id(phone)")
    .eq("id", leadId)
    .single();
  if (!lead) return { error: "Lead not found" };
  if (!lead.assigned_agent_id) return { error: "Lead has no assigned agent" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentPhone = (lead.agent as any)?.phone ?? profile.phone ?? "";
  if (!agentPhone) return { error: "Agent has no phone number" };

  const result = await callService.initiateBridge({
    organizationId: profile.organization_id,
    leadId: lead.id, leadPhone: lead.phone, leadName: lead.full_name, source: lead.source,
    agentId: lead.assigned_agent_id, agentPhone,
  });
  revalidatePath(`/leads/${leadId}`);
  return result;
}

// ===================== MESSAGE ACTIONS =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendQuickMessage(input: any) {
  const { profile } = await requireUser();
  const parsed = messageSendSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads").select("full_name, phone, email").eq("id", parsed.data.lead_id).single();
  if (!lead) return { error: "Lead not found" };
  const to = parsed.data.channel === "email" ? (lead.email ?? "") : lead.phone;
  if (!to) return { error: `Lead has no ${parsed.data.channel} contact` };

  const result = await messageService.send({
    organizationId: profile.organization_id,
    leadId: parsed.data.lead_id,
    sentBy: profile.id,
    channel: parsed.data.channel,
    to,
    body: parsed.data.body,
    subject: parsed.data.subject,
  });
  revalidatePath(`/leads/${parsed.data.lead_id}`);
  return result;
}

// ===================== FOLLOW-UP ACTIONS =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createFollowup(input: any) {
  const { profile } = await requireUser();
  const parsed = followupCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("followups").insert({
    ...parsed.data,
    organization_id: profile.organization_id,
    created_by: profile.id,
    assigned_to: parsed.data.assigned_to ?? profile.id,
  }).select("id").single();
  if (error) return { error: error.message };
  await supabase.from("activities").insert({
    organization_id: profile.organization_id, actor_id: profile.id,
    type: "followup_created", lead_id: parsed.data.lead_id, followup_id: data.id,
    summary: `Follow-up scheduled: ${parsed.data.title}`,
  });
  revalidatePath(`/leads/${parsed.data.lead_id}`);
  revalidatePath("/followups");
  return { ok: true, id: data.id };
}

export async function completeFollowup(id: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data: fu } = await supabase.from("followups").select("lead_id, title").eq("id", id).single();
  await supabase.from("followups").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
  if (fu) {
    await supabase.from("activities").insert({
      organization_id: profile.organization_id, actor_id: profile.id,
      type: "followup_completed", lead_id: fu.lead_id, followup_id: id,
      summary: `Follow-up completed: ${fu.title}`,
    });
  }
  revalidatePath("/followups");
  return { ok: true };
}

export async function snoozeFollowup(id: string, hours: number) {
  await requireUser();
  const supabase = await createClient();
  const { data: cur } = await supabase.from("followups").select("due_at").eq("id", id).single();
  if (!cur) return { error: "Not found" };
  const newDue = new Date(new Date(cur.due_at).getTime() + hours * 3600_000).toISOString();
  await supabase.from("followups").update({ due_at: newDue, status: "snoozed" }).eq("id", id);
  revalidatePath("/followups");
  return { ok: true };
}

// ===================== PROPERTY ACTIONS =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createProperty(input: any) {
  const { profile } = await requireUser();
  const parsed = propertyCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...parsed.data, organization_id: profile.organization_id, created_by: profile.id })
    .select("id, share_token")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/properties");
  return { ok: true, id: data.id, shareToken: data.share_token };
}

export async function addPropertyImageRecord(propertyId: string, url: string, storagePath: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("property_images").select("sort_order").eq("property_id", propertyId);
  const next = (existing?.length ?? 0);
  await supabase.from("property_images").insert({
    organization_id: profile.organization_id, property_id: propertyId,
    url, storage_path: storagePath, sort_order: next,
  });
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true };
}

export async function shareProperty(leadId: string, propertyId: string, channel: "whatsapp"|"sms"|"email", customMessage?: string) {
  const { profile } = await requireUser();
  const r = await propertyShareService.share({
    organizationId: profile.organization_id,
    leadId, propertyId, sharedBy: profile.id, channel, customMessage,
  });
  revalidatePath(`/leads/${leadId}`);
  return r;
}

// ===================== ATTENDANCE =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function attendanceCheckIn(input: any) {
  const { profile } = await requireUser();
  const parsed = attendanceCheckInSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const r = await attendanceService.checkIn({
    organizationId: profile.organization_id, userId: profile.id, ...parsed.data,
  });
  revalidatePath("/more/attendance");
  return r;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function attendanceCheckOut(input: any) {
  const { profile } = await requireUser();
  const r = await attendanceService.checkOut({
    organizationId: profile.organization_id, userId: profile.id, ...(input ?? {}),
  });
  revalidatePath("/more/attendance");
  return r;
}

// ===================== SOCIAL =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSocialPost(input: any) {
  const { profile } = await requireUser();
  const parsed = socialPostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const supabase = await createClient();
  const { error } = await supabase.from("social_posts").insert({
    ...parsed.data, organization_id: profile.organization_id, created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/more/social");
  return { ok: true };
}
export async function publishSocialPost(postId: string) {
  const { profile } = await requireUser();
  const r = await socialPostService.publishOrForward({ organizationId: profile.organization_id, postId });
  revalidatePath("/more/social");
  return r;
}
export async function draftCaption(topic: string) {
  await requireUser();
  const text = await socialPostService.draftCaption(topic);
  return { ok: true, text };
}

// ===================== TEAM / INVITES =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createInvite(input: any) {
  const { profile } = await requireUser();
  if (profile.role !== "admin") return { error: "Only admin can invite" };
  const parsed = inviteCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const admin = createAdminClient();
  const { data, error } = await admin.from("invites").insert({
    organization_id: profile.organization_id, email: parsed.data.email, role: parsed.data.role, invited_by: profile.id,
  }).select("token").single();
  if (error) return { error: error.message };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  revalidatePath("/more/team");
  return { ok: true, inviteUrl: `${baseUrl}/invite?token=${data.token}` };
}

export async function setUserRole(userId: string, role: UserRole) {
  const { profile } = await requireUser();
  if (profile.role !== "admin") return { error: "forbidden" };
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/more/team");
  return { ok: true };
}

export async function deactivateUser(userId: string) {
  const { profile } = await requireUser();
  if (profile.role !== "admin") return { error: "forbidden" };
  const supabase = await createClient();
  await supabase.from("profiles").update({ is_active: false }).eq("id", userId);
  revalidatePath("/more/team");
  return { ok: true };
}

// ===================== INTEGRATION SETTINGS =====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveIntegrationSettings(input: any) {
  const { profile } = await requireUser();
  if (profile.role !== "admin") return { error: "forbidden" };
  const parsed = integrationSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };
  const admin = createAdminClient();
  await admin.from("integration_settings").update({
    lead_webhook_secret: parsed.data.lead_webhook_secret,
    default_assignment_mode: parsed.data.default_assignment_mode,
    social_publish_webhook_url: parsed.data.social_publish_webhook_url || null,
    updated_at: new Date().toISOString(),
  }).eq("organization_id", profile.organization_id);
  revalidatePath("/more/integrations");
  return { ok: true };
}
