"use client";
import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { updateLeadStatus, assignLead, setLeadTemperature, addLeadNote } from "@/lib/db/actions";
import { toast } from "sonner";
import type { Lead, LeadStatus } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadControls({ lead, agents }: { lead: Lead; agents: any[] }) {
  const [pending, start] = useTransition();

  function onStatus(v: string) {
    start(async () => {
      const r = await updateLeadStatus(lead.id, v as LeadStatus);
      if (r.error) toast.error(r.error); else toast.success("Status updated");
    });
  }
  function onAssign(v: string) {
    if (!v) return;
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await assignLead(lead.id, v) as any;
      if (r.error) toast.error(r.error); else toast.success("Reassigned");
    });
  }
  function onTemp(v: "hot"|"warm"|"cold") {
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await setLeadTemperature(lead.id, v) as any;
      if (r.error) toast.error(r.error); else toast.success(`Set ${v}`);
    });
  }
  function onNoteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note = fd.get("note") as string;
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await addLeadNote(lead.id, note) as any;
      if (r.error) toast.error(r.error);
      else { toast.success("Note added"); (e.currentTarget as HTMLFormElement).reset(); }
    });
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle>Manage</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select defaultValue={lead.status} onValueChange={onStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="site_visit_scheduled">Site Visit Scheduled</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="not_responding">Not Responding</SelectItem>
                <SelectItem value="call_pending">Call Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assigned agent</Label>
            <Select defaultValue={lead.assigned_agent_id ?? ""} onValueChange={onAssign}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Temperature</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={lead.temperature === "cold" ? "default" : "outline"} size="sm" onClick={() => onTemp("cold")} disabled={pending}>Cold</Button>
              <Button variant={lead.temperature === "warm" ? "default" : "outline"} size="sm" onClick={() => onTemp("warm")} disabled={pending}>Warm</Button>
              <Button variant={lead.temperature === "hot" ? "destructive" : "outline"} size="sm" onClick={() => onTemp("hot")} disabled={pending}><Flame className="h-3 w-3 mr-1" />Hot</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add Note</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onNoteSubmit} className="space-y-2">
            <Textarea name="note" placeholder="Add a note about this lead…" rows={3} required />
            <Button type="submit" size="sm" disabled={pending}>Save note</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
