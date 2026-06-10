/**
 * leadAssignmentService - picks the next agent for a new lead.
 * Strategies: round_robin (default), least_busy, manual (returns null).
 */
import { createAdminClient } from "@/lib/supabase/server";
import type { AssignmentMode } from "@/lib/types/database";

export const leadAssignmentService = {
  async pickAgent(organizationId: string, mode?: AssignmentMode): Promise<string | null> {
    const supabase = createAdminClient();

    // Resolve mode from integration_settings if not provided
    if (!mode) {
      const { data: settings } = await supabase
        .from("integration_settings")
        .select("default_assignment_mode")
        .eq("organization_id", organizationId)
        .single();
      mode = (settings?.default_assignment_mode as AssignmentMode) ?? "round_robin";
    }

    if (mode === "manual") return null;

    if (mode === "least_busy") {
      const { data } = await supabase.rpc("pick_least_busy_agent", { p_org: organizationId });
      return (data as string) ?? null;
    }

    // round_robin default
    const { data } = await supabase.rpc("pick_next_agent", { p_org: organizationId });
    return (data as string) ?? null;
  },

  async getAgentPhone(agentId: string): Promise<string | null> {
    const supabase = createAdminClient();
    const { data } = await supabase.from("profiles").select("phone").eq("id", agentId).single();
    return data?.phone ?? null;
  },
};
