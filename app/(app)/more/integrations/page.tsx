import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationsForm } from "@/components/integrations/integrations-form";
import { getIntegrationEnvStatus } from "@/lib/utils";

export default async function IntegrationsPage() {
  const { profile } = await requireUser();
  if (profile.role !== "admin") redirect("/dashboard?error=forbidden");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/leads?org=${profile.organization_id}`;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold">Integrations</h1>
      <Card>
        <CardHeader><CardTitle>Lead intake webhook</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>POST leads to this URL with header <code>x-webhook-secret: &lt;your secret&gt;</code>:</p>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">{webhookUrl}</pre>
          <p className="text-muted-foreground">Use this in 36 Acre, MagicBricks, Facebook Lead Ads, Zapier, Make, or any portal that supports webhooks.</p>
        </CardContent>
      </Card>
      <IntegrationsForm initial={settings} envStatus={getIntegrationEnvStatus()} />
    </div>
  );
}
