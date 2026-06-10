"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Bell, Clock,
  Image as ImageIcon, Settings, UserCog, BarChart3, Plug, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const main = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/followups", label: "Follow-ups", icon: Bell },
];

const more = [
  { href: "/more/attendance", label: "Attendance", icon: Clock },
  { href: "/more/social", label: "Social Media", icon: ImageIcon },
  { href: "/more/team", label: "Team", icon: UserCog },
  { href: "/more/reports", label: "Reports", icon: BarChart3 },
  { href: "/more/integrations", label: "Integrations", icon: Plug },
  { href: "/more/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-card/30">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Home className="h-6 w-6 text-primary" />
        <div>
          <div className="font-semibold">EstateFlow</div>
          <div className="text-xs text-muted-foreground">CRM</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Main</p>
        <ul className="mt-1 space-y-0.5">
          {main.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />{label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">More</p>
        <ul className="mt-1 space-y-0.5">
          {more.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    active ? "bg-accent font-medium" : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />{label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
