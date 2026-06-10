import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function NotificationsPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Mark visible ones read
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">Notifications</h1>
      {!notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      ) : notifications.map((n) => {
        const content = (
          <Card className="hover:shadow transition">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.is_read && <Badge variant="default" className="text-[10px] py-0">new</Badge>}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        return n.link_path ? <Link key={n.id} href={n.link_path}>{content}</Link> : <div key={n.id}>{content}</div>;
      })}
    </div>
  );
}
