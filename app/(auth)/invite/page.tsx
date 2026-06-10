import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteAcceptForm } from "./invite-form";
import { createAdminClient } from "@/lib/supabase/server";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Card><CardHeader><CardTitle>Invalid invite</CardTitle><CardDescription>Missing token.</CardDescription></CardHeader></Card>
    );
  }
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invites")
    .select("id, email, role, expires_at, accepted_at, organization_id, organizations(name)")
    .eq("token", token)
    .single();
  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return (
      <Card><CardHeader><CardTitle>Invite unavailable</CardTitle><CardDescription>This invite has expired or already been used.</CardDescription></CardHeader></Card>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgName = (invite as any).organizations?.name ?? "the team";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join {orgName}</CardTitle>
        <CardDescription>You've been invited as <b>{invite.role.replace("_", " ")}</b></CardDescription>
      </CardHeader>
      <CardContent>
        <InviteAcceptForm token={token} email={invite.email} />
      </CardContent>
    </Card>
  );
}
