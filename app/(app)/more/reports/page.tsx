import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLeadsBySource, getLeadsByStatus } from "@/lib/db/dashboard";

export default async function ReportsPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const [bySource, byStatus, attendance, won, lost, shares, followups] = await Promise.all([
    getLeadsBySource(profile.organization_id),
    getLeadsByStatus(profile.organization_id),
    supabase.from("attendance").select("status").eq("organization_id", profile.organization_id),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", profile.organization_id).eq("status", "won"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", profile.organization_id).eq("status", "lost"),
    supabase.from("lead_property_shares").select("id", { count: "exact", head: true }).eq("organization_id", profile.organization_id),
    supabase.from("followups").select("status, id").eq("organization_id", profile.organization_id),
  ]);

  // Agent performance: calls and won leads per agent
  const { data: agentRows } = await supabase
    .from("profiles").select("id, full_name, calls:calls(id, status), wonLeads:leads!leads_assigned_agent_id_fkey(id, status)")
    .eq("organization_id", profile.organization_id).eq("role", "sales_agent");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentPerformance = (agentRows ?? []).map((r: any) => ({
    id: r.id, name: r.full_name,
    calls: r.calls?.length ?? 0,
    won: (r.wonLeads ?? []).filter((l: { status: string }) => l.status === "won").length,
    open: (r.wonLeads ?? []).filter((l: { status: string }) => !["won","lost","not_responding"].includes(l.status)).length,
  }));

  // Attendance
  const attCounts: Record<string, number> = { present: 0, late: 0, absent: 0, half_day: 0, on_leave: 0 };
  (attendance.data ?? []).forEach((a) => { attCounts[a.status] = (attCounts[a.status] ?? 0) + 1; });

  const fuTotal = followups.data?.length ?? 0;
  const fuCompleted = (followups.data ?? []).filter((f) => f.status === "completed").length;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">Reports</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Leads by source</CardTitle></CardHeader>
          <CardContent>
            <BarList items={bySource.map((b) => ({ label: b.source.replace("_", " "), value: b.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leads by status</CardTitle></CardHeader>
          <CardContent>
            <BarList items={byStatus.map((b) => ({ label: b.status.replace("_", " "), value: b.count }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Agent performance</CardTitle></CardHeader>
        <CardContent>
          {agentPerformance.length === 0 ? <p className="text-sm text-muted-foreground">No sales agents yet.</p> : (
            <div className="space-y-2">
              {agentPerformance.map((a) => (
                <div key={a.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground">{a.calls} calls · {a.won} won · {a.open} open</span>
                  </div>
                  <Separator className="my-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Pipeline outcomes</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Won leads" v={won.count ?? 0} />
            <Row k="Lost leads" v={lost.count ?? 0} />
            <Row k="Properties shared" v={shares.count ?? 0} />
            <Row k="Follow-ups completed" v={`${fuCompleted}/${fuTotal}`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Attendance summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(attCounts).map(([k, v]) => <Row key={k} k={k.replace("_", " ")} v={v} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number | string }) {
  return <div className="flex justify-between capitalize"><span className="text-muted-foreground">{k}</span><b>{v}</b></div>;
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No data</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-xs mb-0.5"><span className="capitalize">{i.label}</span><b>{i.value}</b></div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
