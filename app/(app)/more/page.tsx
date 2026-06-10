import Link from "next/link";
import { Clock, Image as ImageIcon, UserCog, BarChart3, Plug, Settings, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const items = [
  { href: "/more/attendance", label: "Attendance", desc: "Check-in/out, GPS, team status", icon: Clock },
  { href: "/more/social", label: "Social Media", desc: "Content calendar & drafts", icon: ImageIcon },
  { href: "/more/team", label: "Team", desc: "Invite & manage users", icon: UserCog },
  { href: "/more/reports", label: "Reports", desc: "Sales & performance", icon: BarChart3 },
  { href: "/more/integrations", label: "Integrations", desc: "Twilio, WhatsApp, email", icon: Plug },
  { href: "/more/settings", label: "Settings", desc: "Profile and organization", icon: Settings },
];

export default function MorePage() {
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">More</h1>
      {items.map((it) => (
        <Link key={it.href} href={it.href}>
          <Card className="p-4 flex items-center gap-3 hover:shadow transition">
            <div className="rounded-lg bg-primary/10 p-2.5"><it.icon className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <p className="font-medium">{it.label}</p>
              <p className="text-xs text-muted-foreground">{it.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
