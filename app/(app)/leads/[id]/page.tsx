import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLead, getLeadTimeline, listAgents, getRecommendedProperties } from "@/lib/db/leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatBudgetRange, formatPhone, timeAgo } from "@/lib/utils";
import { LeadStatusBadge, LeadTemperatureBadge } from "@/components/leads/lead-status-badge";
import { QuickActions } from "@/components/leads/quick-actions";
import { LeadTimeline } from "@/components/leads/lead-timeline";
import { LeadControls } from "@/components/leads/lead-controls";
import { RecommendedProperties } from "@/components/leads/recommended-properties";
import { Mail, Phone, MapPin, User } from "lucide-react";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireUser();
  const lead = await getLead(profile.organization_id, id);
  if (!lead) notFound();
  const [timeline, agents, recommended] = await Promise.all([
    getLeadTimeline(profile.organization_id, id),
    listAgents(profile.organization_id),
    getRecommendedProperties(profile.organization_id, lead),
  ]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14"><AvatarFallback>{initials(lead.full_name)}</AvatarFallback></Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{lead.full_name}</h1>
                <LeadStatusBadge status={lead.status} />
                <LeadTemperatureBadge temperature={lead.temperature} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{formatPhone(lead.phone)}</span>
                {lead.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>}
                {lead.preferred_location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lead.preferred_location}</span>}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(lead as any).agent?.full_name && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{(lead as any).agent.full_name}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span><b>{formatBudgetRange(lead.budget_min, lead.budget_max)}</b></span>
                <span className="text-muted-foreground">·</span>
                <span>{lead.property_type ?? "Any type"}</span>
                <span className="text-muted-foreground">·</span>
                <span>from {lead.source.replace("_", " ")}</span>
                <span className="text-muted-foreground">·</span>
                <span>{timeAgo(lead.created_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent><QuickActions lead={lead} /></CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <RecommendedProperties leadId={lead.id} properties={recommended} />
          <LeadTimeline items={timeline} />
        </div>
        <div className="space-y-4">
          <LeadControls lead={lead} agents={agents} />
          {lead.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{lead.notes}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
