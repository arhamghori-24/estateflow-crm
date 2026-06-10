import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import { Phone, MessageSquare, Share2, Bell, Activity, UserPlus, ArrowRight } from "lucide-react";

const iconFor: Record<string, React.ComponentType<{ className?: string }>> = {
  lead_created: UserPlus, lead_assigned: ArrowRight, lead_status_changed: Activity, lead_note_added: Activity,
  call_started: Phone, call_ended: Phone, message_sent: MessageSquare, property_shared: Share2,
  followup_created: Bell, followup_completed: Bell,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadTimeline({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent><EmptyState icon={Activity} title="No activity yet" description="Calls, messages, and notes will appear here." /></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {items.map((a) => {
            const Icon = iconFor[a.type] ?? Activity;
            return (
              <li key={a.id} className="relative pl-10">
                <div className="absolute left-0 top-0 rounded-full bg-background border p-1.5"><Icon className="h-4 w-4" /></div>
                <p className="text-sm font-medium">{a.summary}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.profiles?.full_name ?? "System"} · {timeAgo(a.created_at)}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
