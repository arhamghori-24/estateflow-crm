import { LeadForm } from "@/components/leads/lead-form";
import { listAgents } from "@/lib/db/leads";
import { requireUser } from "@/lib/auth";

export default async function NewLeadPage() {
  const { profile } = await requireUser();
  const agents = await listAgents(profile.organization_id);
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-bold">New Lead</h1>
      <LeadForm agents={agents} />
    </div>
  );
}
