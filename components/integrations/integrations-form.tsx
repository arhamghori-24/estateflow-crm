"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveIntegrationSettings } from "@/lib/db/actions";
import { toast } from "sonner";
import type { IntegrationSettings } from "@/lib/types/database";
import type { getIntegrationEnvStatus } from "@/lib/utils";

type EnvStatus = ReturnType<typeof getIntegrationEnvStatus>;

export function IntegrationsForm({ initial, envStatus }: { initial: IntegrationSettings | null; envStatus: EnvStatus }) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState(initial?.default_assignment_mode ?? "round_robin");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    start(async () => {
      const r = await saveIntegrationSettings({ ...payload, default_assignment_mode: mode });
      if (r.error) toast.error(r.error); else toast.success("Settings saved");
    });
  }

  return (
    <div className="space-y-4">
      {envStatus.dryRun && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="text-sm py-3">
            <span className="font-medium">Dry-run mode is on</span> (<code>SERVICES_DRY_RUN=true</code>). Twilio, Resend,
            and OpenAI calls are simulated regardless of the connection status below.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Twilio Voice / SMS</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <StatusRow label="Status" configured={envStatus.twilio.configured} />
          <ReadOnly label="Account SID" value={envStatus.twilio.accountSid} />
          <ReadOnly label="Twilio phone" value={envStatus.twilio.phoneNumber} />
          <ReadOnly label="WhatsApp sender" value={envStatus.twilio.whatsappNumber} />
          <p className="sm:col-span-2 text-muted-foreground text-xs">
            Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_PHONE_NUMBER</code>, and{" "}
            <code>TWILIO_WHATSAPP_NUMBER</code> in your environment (e.g. <code>.env.local</code>) to configure this.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Email (Resend)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <StatusRow label="Status" configured={envStatus.resend.configured} />
          <ReadOnly label="API Key" value={envStatus.resend.apiKey} />
          <ReadOnly label="From address" value={envStatus.resend.fromEmail} />
          <p className="sm:col-span-2 text-muted-foreground text-xs">
            Set <code>RESEND_API_KEY</code> and <code>RESEND_FROM_EMAIL</code> in your environment to configure this.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI captions (OpenAI-compatible)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <StatusRow label="Status" configured={envStatus.openai.configured} />
          <ReadOnly label="API Key" value={envStatus.openai.apiKey} />
          <ReadOnly label="Model" value={envStatus.openai.model} />
          <p className="sm:col-span-2 text-muted-foreground text-xs">
            Set <code>OPENAI_API_KEY</code>, <code>OPENAI_BASE_URL</code>, and <code>OPENAI_MODEL</code> in your
            environment to configure this.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Webhooks & lead assignment</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <F label="Lead webhook secret" name="lead_webhook_secret" defaultValue={initial?.lead_webhook_secret ?? ""} />
            <F label="Social publish webhook URL" name="social_publish_webhook_url" defaultValue={initial?.social_publish_webhook_url ?? ""} />
            <div className="space-y-2">
              <Label>Default lead assignment</Label>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="least_busy">Least Busy Agent</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 bg-background py-3 border-t -mx-4 px-4">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Saving…" : "Save settings"}</Button>
        </div>
      </form>
    </div>
  );
}

function StatusRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div>
        <Badge variant={configured ? "default" : "secondary"}>
          {configured ? "Connected" : "Not configured"}
        </Badge>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} disabled readOnly />
    </div>
  );
}

function F({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
