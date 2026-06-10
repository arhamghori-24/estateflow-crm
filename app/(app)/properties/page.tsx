import { Suspense } from "react";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertiesFilters } from "@/components/properties/properties-filters";
import { listProperties } from "@/lib/db/properties";
import { requireUser } from "@/lib/auth";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const { profile } = await requireUser();
  const properties = await listProperties(profile.organization_id, {
    search: params.search,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (params.status as any) ?? "all",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    propertyType: (params.propertyType as any) ?? "all",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Properties</h1>
          <p className="text-sm text-muted-foreground">{properties.length} listings</p>
        </div>
        <Button asChild><Link href="/properties/new"><Plus className="mr-1 h-4 w-4" />Add Property</Link></Button>
      </div>
      <Suspense fallback={<div className="h-12 animate-pulse bg-muted rounded-md" />}>
        <PropertiesFilters />
      </Suspense>
      {properties.length === 0 ? (
        <EmptyState icon={Building2} title="No properties yet" description="Add inventory to start matching with leads." action={<Button asChild><Link href="/properties/new">Add property</Link></Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  );
}
