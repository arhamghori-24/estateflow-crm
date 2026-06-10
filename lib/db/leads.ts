import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadStatus, LeadTemperature, LeadSource } from "@/lib/types/database";

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | "all";
  source?: LeadSource | "all";
  temperature?: LeadTemperature | "all";
  assignedAgentId?: string | "all";
  filter?: "today" | "week" | "all";
}

export async function listLeads(organizationId: string, filters: LeadFilters = {}) {
  const supabase = await createClient();
  let q = supabase
    .from("leads")
    .select("*, agent:assigned_agent_id(full_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.source && filters.source !== "all") q = q.eq("source", filters.source);
  if (filters.temperature && filters.temperature !== "all") q = q.eq("temperature", filters.temperature);
  if (filters.assignedAgentId && filters.assignedAgentId !== "all") q = q.eq("assigned_agent_id", filters.assignedAgentId);
  if (filters.search) {
    const s = filters.search.trim();
    q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }
  if (filters.filter === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    q = q.gte("created_at", start.toISOString());
  } else if (filters.filter === "week") {
    const start = new Date(); start.setDate(start.getDate() - 7);
    q = q.gte("created_at", start.toISOString());
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as (Lead & { agent: { full_name: string } | null })[];
}

export async function getLead(organizationId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, agent:assigned_agent_id(id, full_name, phone)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single();
  return data;
}

export async function getLeadTimeline(organizationId: string, leadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, profiles:actor_id(full_name)")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function listAgents(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("organization_id", organizationId)
    .in("role", ["sales_agent","sales_manager"])
    .eq("is_active", true)
    .order("full_name");
  return data ?? [];
}

export async function getRecommendedProperties(organizationId: string, lead: Lead) {
  const supabase = await createClient();
  let q = supabase
    .from("properties")
    .select("*, property_images(url, sort_order)")
    .eq("organization_id", organizationId)
    .eq("status", "available")
    .limit(5);
  if (lead.property_type) q = q.eq("property_type", lead.property_type);
  if (lead.budget_max) q = q.lte("price", lead.budget_max);
  if (lead.budget_min) q = q.gte("price", lead.budget_min);
  if (lead.preferred_location) q = q.ilike("location", `%${lead.preferred_location}%`);
  const { data } = await q;
  return data ?? [];
}
