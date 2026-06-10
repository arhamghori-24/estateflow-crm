import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database";
export { ROLE_LABELS } from "@/lib/constants";

/** Server helper: get the current authenticated user + profile. Redirects to /login if missing. */
export async function requireUser(): Promise<{ profile: Profile; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/signup?missing-profile=1");
  return { profile, userId: user.id };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return data;
}

export async function requireRole(allowed: UserRole[]) {
  const { profile } = await requireUser();
  if (!allowed.includes(profile.role)) redirect("/dashboard?error=forbidden");
  return profile;
}

