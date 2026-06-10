"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Building2, Share2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { shareProperty } from "@/lib/db/actions";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RecommendedProperties({ leadId, properties }: { leadId: string; properties: any[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [channel, setChannel] = useState<"whatsapp"|"sms"|"email">("whatsapp");
  const [pending, start] = useTransition();

  function startShare(propertyId: string) { setSelected(propertyId); setOpen(true); }
  function confirmShare() {
    if (!selected) return;
    start(async () => {
      const r = await shareProperty(leadId, selected, channel);
      if (r.error) toast.error(r.error);
      else { toast.success(r.dryRun ? "Dry-run: share logged" : "Sent"); setOpen(false); }
    });
  }

  if (!properties.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Recommended Properties</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={Building2} title="No matches yet" description="Add more inventory or adjust the lead's budget / location." />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>Recommended Properties</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {properties.map((p) => {
          const img = p.property_images?.[0]?.url ?? "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400";
          return (
            <div key={p.id} className="flex gap-3 items-center">
              <div className="relative h-16 w-20 rounded-lg overflow-hidden bg-muted shrink-0">
                <Image src={img} alt={p.title} fill className="object-cover" sizes="80px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{formatCurrency(p.price)}</Badge>
                  <Badge variant="outline" className="text-xs">{p.property_type}</Badge>
                </div>
              </div>
              <Button variant="whatsapp" size="sm" onClick={() => startShare(p.id)}>
                <Share2 className="h-4 w-4 mr-1" />Share
              </Button>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share property</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as "whatsapp"|"sms"|"email")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">A pre-formatted message with photos and price will be sent + a public share link generated.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={confirmShare} disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
