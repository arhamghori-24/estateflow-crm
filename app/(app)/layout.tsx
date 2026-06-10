import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);

  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex flex-1 flex-col">
        <TopBar profile={profile} unreadCount={count ?? 0} />
        <main className="flex-1 px-4 py-4 pb-24 md:px-6 md:pb-6 md:py-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
