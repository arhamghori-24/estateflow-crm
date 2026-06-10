"use client";
import { useState, useTransition } from "react";
import { Phone, MessageSquare, Share2, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { triggerBridgeCall, sendQuickMessage, createFollowup } from "@/lib/db/actions";
import { toast } from "sonner";
import type { Lead } from "@/lib/types/database";

const TEMPLATES = [
  { key: "intro_review", body: "Hi {name}, just checking if you had a chance to review the property details I shared." },
  { key: "schedule_call", body: "Hi {name}, are you available for a quick call today to discuss properties in {location}?" },
  { key: "new_options", body: "Hi {name}, we have a few new options matching your budget. Should I share them?" },
];

export function QuickActions({ lead }: { lead: Lead }) {
  const [pending, start] = useTransition();
  const [openMsg, setOpenMsg] = useState(false);
  const [openFu, setOpenFu] = useState(false);
  const [channel, setChannel] = useState<"whatsapp"|"sms"|"email">("whatsapp");
  const [body, setBody] = useState("");

  function applyTemplate(k: string) {
    const t = TEMPLATES.find((x) => x.key === k);
    if (!t) return;
    setBody(t.body
      .replace(/{name}/g, lead.full_name.split(" ")[0])
      .replace(/{location}/g, lead.preferred_location ?? "your preferred area"));
  }

  function onCall() {
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await triggerBridgeCall(lead.id) as any;
      if (r.error) toast.error(r.error);
      else toast.success(r.dryRun ? "Dry-run call simulated" : "Bridge call started");
    });
  }

  function onSend() {
    if (!body.trim()) { toast.error("Message body required"); return; }
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await sendQuickMessage({ lead_id: lead.id, channel, body }) as any;
      if (r.error) toast.error(r.error);
      else { toast.success(r.dryRun ? "Dry-run: logged" : "Sent"); setOpenMsg(false); setBody(""); }
    });
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      <ActionBtn icon={Phone} label="Call" onClick={onCall} disabled={pending} variant="success" />
      <ActionBtn icon={MessageSquare} label="WhatsApp" onClick={() => { setChannel("whatsapp"); setOpenMsg(true); }} variant="whatsapp" />
      <ActionBtn icon={Share2} label="SMS" onClick={() => { setChannel("sms"); setOpenMsg(true); }} variant="secondary" />
      <ActionBtn icon={Mail} label="Email" onClick={() => { setChannel("email"); setOpenMsg(true); }} variant="outline" />

      {/* Send Message Dialog */}
      <Dialog open={openMsg} onOpenChange={setOpenMsg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {channel}</DialogTitle>
            <DialogDescription>To {lead.full_name} · {channel === "email" ? lead.email ?? "no email" : lead.phone}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quick templates</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TEMPLATES.map((t) => (
                  <Button key={t.key} variant="outline" size="sm" type="button" onClick={() => applyTemplate(t.key)}>
                    {t.key.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={onSend} disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionBtn icon={Calendar} label="Follow-up" onClick={() => setOpenFu(true)} variant="outline" className="col-span-4" />
      <FollowupDialog open={openFu} setOpen={setOpenFu} lead={lead} />
    </div>
  );
}

function ActionBtn({ icon: Icon, label, variant, ...rest }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variant?: any;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button variant={variant} className="h-16 flex-col gap-1" {...rest}>
      <Icon className="h-5 w-5" /><span className="text-xs">{label}</span>
    </Button>
  );
}

function FollowupDialog({ open, setOpen, lead }: { open: boolean; setOpen: (b: boolean) => void; lead: Lead }) {
  const [pending, start] = useTransition();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const due = (fd.get("due") as string) || new Date(Date.now() + 24 * 3600_000).toISOString();
      const r = await createFollowup({
        lead_id: lead.id,
        type: fd.get("type"),
        title: fd.get("title"),
        notes: fd.get("notes") || null,
        due_at: new Date(due).toISOString(),
      });
      if (r.error) toast.error(r.error);
      else { toast.success("Follow-up scheduled"); setOpen(false); }
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select name="type" defaultValue="call">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Title</Label><Input name="title" required defaultValue={`Follow up with ${lead.full_name}`} /></div>
          <div className="space-y-2"><Label>Due date/time</Label><Input name="due" type="datetime-local" required defaultValue={localDt(new Date(Date.now() + 24*3600_000))} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={3} /></div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Schedule"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function localDt(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}
