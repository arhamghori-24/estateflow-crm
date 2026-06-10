import { requireUser } from "@/lib/auth";
import { getDashboardMetrics, getRecentActivities } from "@/lib/db/dashboard";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Bell, Flame, MapPin, Building2, Clock, UserCheck, Plus, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const [metrics, activities] = await Promise.all([
    getDashboardMetrics(profile.organization_id),
    getRecentActivities(profile.organization_id, 12),
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Hi {profile.full_name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening today</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link href="/leads/new"><Plus className="mr-1 h-4 w-4" /> New Lead</Link></Button>
          <Button asChild size="sm"><Link href="/properties/new"><Building2 className="mr-1 h-4 w-4" /> New Property</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="New leads today" value={metrics.newLeadsToday} icon={Users} href="/leads?filter=today" />
        <MetricCard title="Calls today" value={metrics.callsToday} icon={Phone} tone="success" />
        <MetricCard title="Follow-ups due" value={metrics.followupsDueToday} icon={Bell} href="/followups" tone="warning" />
        <MetricCard title="Hot leads" value={metrics.hotLeads} icon={Flame} href="/leads?temperature=hot" tone="danger" />
        <MetricCard title="Site visits" value={metrics.siteVisitsScheduled} icon={MapPin} href="/leads?status=site_visit_scheduled" />
        <MetricCard title="Available inventory" value={metrics.availableInventory} icon={Building2} href="/properties" />
        <MetricCard title="Checked in now" value={`${metrics.checkedInCount}/${metrics.totalTeam}`} icon={UserCheck} href="/more/attendance" tone="success" />
        <MetricCard title="Pending tasks" value={metrics.followupsDueToday} icon={Clock} href="/followups" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-20 flex-col"><Link href="/leads/new"><Plus className="h-5 w-5 mb-1" />New Lead</Link></Button>
            <Button asChild variant="outline" className="h-20 flex-col"><Link href="/properties/new"><Building2 className="h-5 w-5 mb-1" />Add Property</Link></Button>
            <Button asChild variant="outline" className="h-20 flex-col"><Link href="/more/attendance"><Clock className="h-5 w-5 mb-1" />Attendance</Link></Button>
            <Button asChild variant="outline" className="h-20 flex-col"><Link href="/followups"><MessageSquare className="h-5 w-5 mb-1" />Follow-ups</Link></Button>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
}
