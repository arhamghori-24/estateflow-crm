import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth";
import { InviteForm } from "@/components/team/invite-form";
import { TeamRowActions } from "@/components/team/team-row-actions";

export default async function TeamPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("*").eq("organization_id", profile.organization_id).order("created_at"),
    supabase.from("invites").select("*").eq("organization_id", profile.organization_id).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  const isAdmin = profile.role === "admin";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">Team</h1>

      {isAdmin && <InviteForm />}

      <Card>
        <CardHeader><CardTitle>Members ({members?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar className="h-10 w-10"><AvatarFallback>{initials(m.full_name)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.full_name}{!m.is_active && <span className="text-xs text-muted-foreground"> (inactive)</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <Badge variant="outline">{ROLE_LABELS[m.role as import("@/lib/types/database").UserRole]}</Badge>
              {isAdmin && m.id !== profile.id && <TeamRowActions member={m as import("@/lib/types/database").Profile} />}
            </div>
          ))}
        </CardContent>
      </Card>

      {invites && invites.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending invites</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                <div>
                  <p>{i.email}</p>
                  <p className="text-xs text-muted-foreground">expires {new Date(i.expires_at).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline">{ROLE_LABELS[i.role as keyof typeof ROLE_LABELS]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
