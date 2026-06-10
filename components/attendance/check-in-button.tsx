"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, LogIn, LogOut, Loader2 } from "lucide-react";
import { attendanceCheckIn, attendanceCheckOut } from "@/lib/db/actions";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AttendanceCheckInButton({ open }: { open: any | null }) {
  const [pending, start] = useTransition();
  const [getting, setGetting] = useState(false);
  const [notes, setNotes] = useState("");

  async function getPosition(): Promise<GeolocationPosition | null> {
    setGetting(true);
    try {
      return await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 8000, enableHighAccuracy: true }
        );
      });
    } finally {
      setGetting(false);
    }
  }

  function checkIn() {
    start(async () => {
      const pos = await getPosition();
      const r = await attendanceCheckIn({
        lat: pos?.coords.latitude, lng: pos?.coords.longitude, notes,
      });
      if (r.error) toast.error(r.error);
      else toast.success("Checked in");
    });
  }

  function checkOut() {
    start(async () => {
      const pos = await getPosition();
      const r = await attendanceCheckOut({ lat: pos?.coords.latitude, lng: pos?.coords.longitude });
      if (r.error) toast.error(r.error);
      else toast.success("Checked out");
    });
  }

  const busy = pending || getting;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        {open ? (
          <>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <p className="text-sm">You checked in at {new Date(open.check_in_at).toLocaleTimeString()}</p>
            </div>
            {open.check_in_lat && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />{open.check_in_lat.toFixed(4)}, {open.check_in_lng?.toFixed(4)}
              </p>
            )}
            <Button onClick={checkOut} variant="destructive" size="xl" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Check Out
            </Button>
          </>
        ) : (
          <>
            <Textarea placeholder="Optional notes (field visit, etc.)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button onClick={checkIn} size="xl" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              Check In
            </Button>
            <p className="text-xs text-center text-muted-foreground">GPS will be captured automatically.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
