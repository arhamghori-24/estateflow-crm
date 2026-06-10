import { createClient } from "@/lib/supabase/server";
import { todayRange } from "@/lib/utils";

export interface DashboardMetrics {
  newLeadsToday: number;
  callsToday: number;
  followupsDueToday: number;
  hotLeads: number;
  siteVisitsScheduled: number;
  availableInventory: number;
  checkedInCount: number;
  totalTeam: number;
}

export async function getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const { start, end } = todayRange();

  const [
    leads, calls, followups, hot, site, inventory, attendance, team,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).gte("created_at", start).lte("created_at", end),
    supabase.from("calls").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).gte("started_at", start).lte("started_at", end),
    supabase.from("followups").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "pending").gte("due_at", start).lte("due_at", end),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("temperature", "hot"),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "site_visit_scheduled"),
    supabase.from("properties").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "available"),
    supabase.from("attendance").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).is("check_out_at", null),
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("is_active", true),
  ]);

  return {
    newLeadsToday: leads.count ?? 0,
    callsToday: calls.count ?? 0,
    followupsDueToday: followups.count ?? 0,
    hotLeads: hot.count ?? 0,
    siteVisitsScheduled: site.count ?? 0,
    availableInventory: inventory.count ?? 0,
    checkedInCount: attendance.count ?? 0,
    totalTeam: team.count ?? 0,
  };
}

export async function getRecentActivities(organizationId: string, limit = 15) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, profiles:actor_id(full_name), leads:lead_id(full_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getLeadsBySource(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("source")
    .eq("organization_id", organizationId);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r) => { counts[r.source] = (counts[r.source] ?? 0) + 1; });
  return Object.entries(counts).map(([source, count]) => ({ source, count }));
}

export async function getLeadsByStatus(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("status").eq("organization_id", organizationId);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}
