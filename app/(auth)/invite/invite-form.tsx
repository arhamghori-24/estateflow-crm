"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function InviteAcceptForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, fullName, phone, password }),
    });
    setBusy(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Welcome!");
    router.push("/login");
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full">Full name</Label>
        <Input id="full" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw">Choose a password</Label>
        <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Joining…" : "Accept invite"}</Button>
    </form>
  );
}
