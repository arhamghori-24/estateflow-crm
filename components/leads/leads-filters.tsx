"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export function LeadsFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  function set(k: string, v: string) {
    const params = new URLSearchParams(sp.toString());
    if (!v || v === "all") params.delete(k); else params.set(k, v);
    router.push(`/leads?${params.toString()}`);
  }
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          defaultValue={sp.get("search") ?? ""}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search name, phone, email…"
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-3 sm:flex gap-2">
        <Select defaultValue={sp.get("status") ?? "all"} onValueChange={(v) => set("status", v)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="site_visit_scheduled">Site Visit</SelectItem>
            <SelectItem value="negotiation">Negotiating</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="not_responding">Not Responding</SelectItem>
            <SelectItem value="call_pending">Call Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue={sp.get("temperature") ?? "all"} onValueChange={(v) => set("temperature", v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Temp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All temps</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue={sp.get("source") ?? "all"} onValueChange={(v) => set("source", v)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
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
    </div>
  );
}
