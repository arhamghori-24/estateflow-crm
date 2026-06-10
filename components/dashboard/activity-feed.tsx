import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import { Activity as ActivityIcon, Phone, MessageSquare, Share2, Bell, Clock, UserPlus, ArrowRight } from "lucide-react";
import Link from "next/link";

const iconFor: Record<string, React.ComponentType<{ className?: string }>> = {
  lead_created: UserPlus,
  lead_assigned: ArrowRight,
  lead_status_changed: ActivityIcon,
  lead_note_added: ActivityIcon,
  call_started: Phone,
  call_ended: Phone,
  message_sent: MessageSquare,
  property_shared: Share2,
  followup_created: Bell,
  followup_completed: Bell,
  attendance_checked_in: Clock,
  attendance_checked_out: Clock,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivityFeed({ activities }: { activities: any[] }) {
  if (!activities.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={ActivityIcon} title="No activity yet" description="Activity will appear here as your team works." />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {activities.map((a) => {
          const Icon = iconFor[a.type] ?? ActivityIcon;
          return (
            <div key={a.id} className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2 mt-0.5"><Icon className="h-3.5 w-3.5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{a.summary}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.profiles?.full_name ?? "System"} · {timeAgo(a.created_at)}
                  {a.lead_id && <> · <Link href={`/leads/${a.lead_id}`} className="text-primary hover:underline">view lead</Link></>}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
