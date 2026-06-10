import { createClient } from "@/lib/supabase/server";
import type { Property, PropertyImage, PropertyStatus, PropertyType } from "@/lib/types/database";

export interface PropertyFilters {
  search?: string;
  status?: PropertyStatus | "all";
  propertyType?: PropertyType | "all";
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}

export async function listProperties(orgId: string, filters: PropertyFilters = {}) {
  const supabase = await createClient();
  let q = supabase
    .from("properties")
    .select("*, property_images(url, sort_order)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.propertyType && filters.propertyType !== "all") q = q.eq("property_type", filters.propertyType);
  if (filters.search) q = q.or(`title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  if (filters.minPrice) q = q.gte("price", filters.minPrice);
  if (filters.maxPrice) q = q.lte("price", filters.maxPrice);
  if (filters.location) q = q.ilike("location", `%${filters.location}%`);
  const { data } = await q;
  return (data ?? []) as (Property & { property_images: PropertyImage[] })[];
}

export async function getProperty(orgId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(*), property_documents(*)")
    .eq("organization_id", orgId)
    .eq("id", id)
    .single();
  return data;
}

export async function getPropertyByShareToken(token: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(url, sort_order)")
    .eq("share_token", token)
    .maybeSingle();
  return data;
}
