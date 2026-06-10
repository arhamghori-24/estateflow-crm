/** attendanceService - check-in / check-out with GPS. */
import { createAdminClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./types";

interface CheckInRequest {
  organizationId: string;
  userId: string;
  lat?: number;
  lng?: number;
  selfieUrl?: string;
  notes?: string;
}
interface CheckOutRequest {
  organizationId: string;
  userId: string;
  lat?: number;
  lng?: number;
  fieldVisitNotes?: string;
}

export const attendanceService = {
  async checkIn(req: CheckInRequest): Promise<ServiceResult<{ attendanceId: string }>> {
    const supabase = createAdminClient();

    // Prevent double-check-in: must close any open record first
    const { data: open } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", req.userId)
      .is("check_out_at", null)
      .maybeSingle();
    if (open) return { ok: false, dryRun: false, error: "You are already checked in" };

    // Late if after 09:30
    const now = new Date();
    const status = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30) ? "late" : "present";

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        organization_id: req.organizationId,
        user_id: req.userId,
        check_in_lat: req.lat,
        check_in_lng: req.lng,
        check_in_selfie_url: req.selfieUrl,
        status,
        notes: req.notes,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, dryRun: false, error: error?.message };

    await supabase.from("activities").insert({
      organization_id: req.organizationId,
      actor_id: req.userId,
      type: "attendance_checked_in",
      attendance_id: data.id,
      summary: `Checked in (${status})`,
      metadata: { lat: req.lat, lng: req.lng },
    });

    return { ok: true, dryRun: false, data: { attendanceId: data.id } };
  },

  async checkOut(req: CheckOutRequest): Promise<ServiceResult<{ attendanceId: string }>> {
    const supabase = createAdminClient();

    const { data: open } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", req.userId)
      .is("check_out_at", null)
      .maybeSingle();
    if (!open) return { ok: false, dryRun: false, error: "No open check-in to close" };

    const { error } = await supabase
      .from("attendance")
      .update({
        check_out_at: new Date().toISOString(),
        check_out_lat: req.lat,
        check_out_lng: req.lng,
        field_visit_notes: req.fieldVisitNotes,
      })
      .eq("id", open.id);
    if (error) return { ok: false, dryRun: false, error: error.message };

    await supabase.from("activities").insert({
      organization_id: req.organizationId,
      actor_id: req.userId,
      type: "attendance_checked_out",
      attendance_id: open.id,
      summary: "Checked out",
    });

    return { ok: true, dryRun: false, data: { attendanceId: open.id } };
  },
};
