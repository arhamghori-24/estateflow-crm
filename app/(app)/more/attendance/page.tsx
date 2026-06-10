import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/utils";
import { AttendanceCheckInButton } from "@/components/attendance/check-in-button";
import { MapPin, Clock as ClockIcon } from "lucide-react";

export default async function AttendancePage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const [{ data: myOpen }, { data: myHistory }, { data: teamToday }] = await Promise.all([
    supabase.from("attendance").select("*").eq("user_id", profile.id).is("check_out_at", null).maybeSingle(),
    supabase.from("attendance").select("*").eq("user_id", profile.id)
      .order("check_in_at", { ascending: false }).limit(10),
    supabase.from("attendance")
      .select("*, profiles:user_id(full_name, role)")
      .eq("organization_id", profile.organization_id)
      .gte("check_in_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order("check_in_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">Attendance</h1>

      <AttendanceCheckInButton open={myOpen ?? null} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>My recent history</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(myHistory ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records yet.</p>
            ) : (myHistory ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{new Date(r.check_in_at).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.check_in_at).toLocaleTimeString()} — {r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString() : "open"}
                  </p>
                </div>
                <Badge variant={r.status === "present" ? "success" : r.status === "late" ? "warning" : "secondary"} className="capitalize">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Today's team check-ins</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(teamToday ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has checked in today.</p>
            ) : (teamToday ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b pb-2 last:border-b-0">
                <Avatar className="h-9 w-9"><AvatarFallback>{initials(r.profiles?.full_name ?? "?")}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <ClockIcon className="h-3 w-3" />{timeAgo(r.check_in_at)}
                    {r.check_in_lat && <><MapPin className="h-3 w-3" />{r.check_in_lat.toFixed(3)}, {r.check_in_lng?.toFixed(3)}</>}
                  </p>
                </div>
                <Badge variant={r.check_out_at ? "outline" : "success"}>
                  {r.check_out_at ? "checked out" : "live"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
