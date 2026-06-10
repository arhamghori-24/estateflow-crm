"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvite } from "@/lib/db/actions";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export function InviteForm() {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createInvite({ email: fd.get("email"), role: fd.get("role") });
      if (r.error) { toast.error(r.error); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLink((r as any).inviteUrl);
      toast.success("Invite created. Share the link below.");
      (e.currentTarget as HTMLFormElement).reset();
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Invite a teammate</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="grid sm:grid-cols-[1fr_180px_auto] gap-2">
          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <Select name="role" defaultValue="sales_agent">
              <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                <SelectItem value="sales_agent">Sales Agent</SelectItem>
                <SelectItem value="field_executive">Field Executive</SelectItem>
                <SelectItem value="social_media_manager">Social Media Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="sm:self-end" disabled={pending}>{pending ? "…" : "Invite"}</Button>
        </form>
        {link && (
          <div className="rounded-md border p-2 flex items-center gap-2">
            <Input value={link} readOnly className="text-xs" />
            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
