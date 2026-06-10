"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { completeFollowup, snoozeFollowup } from "@/lib/db/actions";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FollowupActions({ followup }: { followup: any }) {
  const [pending, start] = useTransition();
  function complete() {
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await completeFollowup(followup.id) as any;
      if (r.error) toast.error(r.error); else toast.success("Completed");
    });
  }
  function snooze(h: number) {
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await snoozeFollowup(followup.id, h) as any;
      if (r.error) toast.error(r.error); else toast.success(`Snoozed ${h}h`);
    });
  }
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <Button size="sm" variant="success" onClick={complete} disabled={pending}>
        <CheckCircle2 className="h-3 w-3 mr-1" />Done
      </Button>
      <Button size="sm" variant="outline" onClick={() => snooze(24)} disabled={pending}>
        <Clock className="h-3 w-3 mr-1" />+1d
      </Button>
    </div>
  );
}
