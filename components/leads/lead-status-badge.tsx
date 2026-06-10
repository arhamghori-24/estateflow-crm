import { Badge } from "@/components/ui/badge";
import type { LeadStatus, LeadTemperature } from "@/lib/types/database";

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New", contacted: "Contacted", interested: "Interested",
  site_visit_scheduled: "Site Visit", negotiation: "Negotiating",
  won: "Won", lost: "Lost", not_responding: "Not Responding", call_pending: "Call Pending",
};
const STATUS_TONE: Record<LeadStatus, "default"|"secondary"|"destructive"|"outline"|"success"|"warning"> = {
  new: "default", contacted: "secondary", interested: "warning",
  site_visit_scheduled: "warning", negotiation: "warning",
  won: "success", lost: "destructive", not_responding: "destructive", call_pending: "destructive",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function LeadTemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const label = { hot: "🔥 Hot", warm: "Warm", cold: "Cold" }[temperature];
  return <Badge variant={temperature}>{label}</Badge>;
}
