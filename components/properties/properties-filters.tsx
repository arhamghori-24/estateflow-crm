"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export function PropertiesFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  function set(k: string, v: string) {
    const params = new URLSearchParams(sp.toString());
    if (!v || v === "all") params.delete(k); else params.set(k, v);
    router.push(`/properties?${params.toString()}`);
  }
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          defaultValue={sp.get("search") ?? ""}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search title, location…"
          className="pl-9"
        />
      </div>
      <Select defaultValue={sp.get("status") ?? "all"} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="available">Available</SelectItem>
          <SelectItem value="hold">On Hold</SelectItem>
          <SelectItem value="sold">Sold</SelectItem>
          <SelectItem value="rented">Rented</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue={sp.get("propertyType") ?? "all"} onValueChange={(v) => set("propertyType", v)}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="apartment">Apartment</SelectItem>
          <SelectItem value="villa">Villa</SelectItem>
          <SelectItem value="plot">Plot</SelectItem>
          <SelectItem value="commercial">Commercial</SelectItem>
          <SelectItem value="rental">Rental</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
