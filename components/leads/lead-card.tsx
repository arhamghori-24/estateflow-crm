import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeadStatusBadge, LeadTemperatureBadge } from "./lead-status-badge";
import { initials, formatBudgetRange, timeAgo } from "@/lib/utils";
import { MapPin, Phone } from "lucide-react";
import type { Lead } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadCard({ lead }: { lead: Lead & { agent?: any } }) {
  return (
    <Link href={`/leads/${lead.id}`}>
      <Card className="p-3 active:scale-[0.99] transition hover:shadow-md">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10"><AvatarFallback>{initials(lead.full_name)}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{lead.full_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />{lead.phone}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <LeadStatusBadge status={lead.status} />
                <LeadTemperatureBadge temperature={lead.temperature} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {lead.preferred_location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.preferred_location}</span>
              )}
              <span>{formatBudgetRange(lead.budget_min, lead.budget_max)}</span>
              <span className="ml-auto">{timeAgo(lead.created_at)}</span>
            </div>
            {lead.agent && <p className="mt-1.5 text-xs">→ {lead.agent.full_name}</p>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
