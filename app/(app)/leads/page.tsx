import { Suspense } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { requireUser } from "@/lib/auth";
import { listLeads } from "@/lib/db/leads";
import type { LeadFilters } from "@/lib/db/leads";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const { profile } = await requireUser();
  const filters: LeadFilters = {
    search: params.search,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (params.status as any) ?? "all",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: (params.source as any) ?? "all",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    temperature: (params.temperature as any) ?? "all",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: (params.filter as any) ?? "all",
  };
  const leads = await listLeads(profile.organization_id, filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total</p>
        </div>
        <Button asChild><Link href="/leads/new"><Plus className="mr-1 h-4 w-4" />Add Lead</Link></Button>
      </div>

      <Suspense fallback={<div className="h-12 animate-pulse bg-muted rounded-md" />}>
        <LeadsFilters />
      </Suspense>

      {leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Create a lead manually or set up the webhook to auto-import from your portals."
          action={<Button asChild><Link href="/leads/new">Add your first lead</Link></Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      )}
    </div>
  );
}
