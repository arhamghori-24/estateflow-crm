import { requireUser, ROLE_LABELS } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const { profile } = await requireUser();
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="Name" v={profile.full_name} />
          <Row k="Email" v={profile.email} />
          <Row k="Phone" v={profile.phone ?? "—"} />
          <Row k="Role" v={ROLE_LABELS[profile.role]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>EstateFlow CRM</p>
          <p>Built for real estate sales teams who get leads from 36 Acre, MagicBricks, Housing, Facebook, Instagram, and more.</p>
        </CardContent>
      </Card>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b pb-2 last:border-b-0"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;
}
