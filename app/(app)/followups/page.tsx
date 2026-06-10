import Link from "next/link";
import { Bell, CheckCircle2, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FollowupActions } from "@/components/followups/followup-actions";
import { timeAgo } from "@/lib/utils";

export default async function FollowupsPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const [{ data: pending }, { data: completed }] = await Promise.all([
    supabase.from("followups")
      .select("*, leads:lead_id(full_name, phone, status)")
      .eq("organization_id", profile.organization_id)
      .eq("status", "pending")
      .order("due_at", { ascending: true }),
    supabase.from("followups")
      .select("*, leads:lead_id(full_name)")
      .eq("organization_id", profile.organization_id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50),
  ]);

  const overdueCount = (pending ?? []).filter((f) => new Date(f.due_at) < new Date()).length;
  const todayCount = (pending ?? []).filter((f) => {
    const due = new Date(f.due_at);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return due >= today && due < tomorrow;
  }).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">{(pending ?? []).length} pending · {overdueCount} overdue · {todayCount} due today</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="pending">Pending ({(pending ?? []).length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({(completed ?? []).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-2">
          {!pending?.length ? (
            <EmptyState icon={Bell} title="No follow-ups pending" description="Great job! All clear for now." />
          ) : pending.map((f) => {
            const overdue = new Date(f.due_at) < new Date();
            return (
              <Card key={f.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{f.title}</p>
                        <Badge variant="outline" className="capitalize text-xs">{f.type}</Badge>
                        {overdue && <Badge variant="destructive" className="text-xs">overdue</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Link href={`/leads/${f.lead_id}`} className="hover:underline">
                          {f.leads?.full_name ?? "Lead"}
                        </Link> · {f.leads?.phone}
                      </p>
                      {f.notes && <p className="text-sm text-muted-foreground mt-1">{f.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />Due {new Date(f.due_at).toLocaleString()}
                      </p>
                    </div>
                    <FollowupActions followup={f} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        <TabsContent value="completed" className="space-y-2">
          {!completed?.length ? (
            <EmptyState icon={CheckCircle2} title="No completed follow-ups yet" />
          ) : completed.map((f) => (
            <Card key={f.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="font-medium line-through text-muted-foreground">{f.title}</p>
                  <Badge variant="outline" className="capitalize text-xs">{f.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {f.leads?.full_name ?? "Lead"} · completed {timeAgo(f.completed_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
