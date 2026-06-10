"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/followups", label: "Follow-ups", icon: Bell },
  { href: "/more", label: "More", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur safe-bottom md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
