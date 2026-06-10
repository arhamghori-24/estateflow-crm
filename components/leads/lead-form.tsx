"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createLead } from "@/lib/db/actions";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadForm({ agents }: { agents: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("manual");
  const [propertyType, setPropertyType] = useState("apartment");
  const [temperature, setTemperature] = useState("warm");
  const [assignedAgentId, setAssignedAgentId] = useState("auto");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: fd.get("full_name"),
      phone: fd.get("phone"),
      email: fd.get("email") || null,
      source,
      property_type: propertyType,
      budget_min: fd.get("budget_min") || null,
      budget_max: fd.get("budget_max") || null,
      preferred_location: fd.get("preferred_location") || null,
      temperature,
      notes: fd.get("notes") || null,
      assigned_agent_id: assignedAgentId === "auto" ? null : assignedAgentId,
    };
    const res = await createLead(payload);
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Lead created");
    router.push(`/leads/${res.id}`);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" name="full_name" required />
            <Field label="Phone" name="phone" type="tel" required placeholder="+91 99999 99999" />
            <Field label="Email" name="email" type="email" />
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="36_acre">36 Acre</SelectItem>
                  <SelectItem value="magicbricks">MagicBricks</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Interested property type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="property_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="plot">Plot</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Preferred location" name="preferred_location" placeholder="Gurgaon" />
            <Field label="Budget min (₹)" name="budget_min" type="number" />
            <Field label="Budget max (₹)" name="budget_max" type="number" />
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Select value={temperature} onValueChange={setTemperature}>
                <SelectTrigger id="temperature"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_agent_id">Assign to (or auto)</Label>
              <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                <SelectTrigger id="assigned_agent_id"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign (round-robin)</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea name="notes" id="notes" rows={3} placeholder="Lead context, requirements, etc." />
          </div>

          <div className="flex gap-2 sticky bottom-0 bg-background py-3 -mx-6 px-6 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={busy} className="flex-1">{busy ? "Creating…" : "Create Lead"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, name, type = "text", required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required && " *"}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}
