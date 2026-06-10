"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function SignupForm() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (!user) throw new Error("Signup failed");

      // Server action to create org + profile (uses service role)
      const res = await fetch("/api/auth/setup-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email, orgName, fullName, phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Setup failed");
      }
      toast.success("Workspace created!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="orgName">Company / Agency name</Label>
        <Input id="orgName" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="DLF Realty" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Your full name</Label>
        <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aarav Mehta" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create workspace"}</Button>
    </form>
  );
}
