"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProperty } from "@/lib/db/actions";
import { toast } from "sonner";

export function PropertyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [propertyType, setPropertyType] = useState("apartment");
  const [status, setStatus] = useState("available");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      location: fd.get("location"),
      address: fd.get("address") || null,
      property_type: propertyType,
      price: fd.get("price"),
      size_sqft: fd.get("size_sqft") || null,
      bedrooms: fd.get("bedrooms") || null,
      bathrooms: fd.get("bathrooms") || null,
      floor: fd.get("floor") || null,
      furnishing: fd.get("furnishing") || null,
      status,
      description: fd.get("description") || null,
      amenities: (fd.get("amenities") as string ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      developer_name: fd.get("developer_name") || null,
    };
    const res = await createProperty(payload);
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Property created");
    router.push(`/properties/${res.id}`);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Title" name="title" required />
            <Field label="Location" name="location" required placeholder="Gurgaon" />
            <Field label="Address" name="address" />
            <div className="space-y-2">
              <Label htmlFor="property_type">Type</Label>
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
            <Field label="Price (₹)" name="price" type="number" required />
            <Field label="Size (sq.ft)" name="size_sqft" type="number" />
            <Field label="Bedrooms" name="bedrooms" type="number" />
            <Field label="Bathrooms" name="bathrooms" type="number" />
            <Field label="Floor" name="floor" type="number" />
            <Field label="Furnishing" name="furnishing" placeholder="Unfurnished / Semi / Fully" />
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="hold">On Hold</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Developer / Owner" name="developer_name" />
          </div>
          <Field label="Amenities (comma-separated)" name="amenities" placeholder="Parking, Pool, Gym, Power Backup" />
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea name="description" id="description" rows={4} />
          </div>
          <div className="flex gap-2 sticky bottom-0 bg-background py-3 -mx-6 px-6 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={busy} className="flex-1">{busy ? "Saving…" : "Create"}</Button>
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
