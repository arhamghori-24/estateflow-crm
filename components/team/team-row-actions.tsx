"use client";
import { useTransition } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { setUserRole, deactivateUser } from "@/lib/db/actions";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/lib/types/database";

export function TeamRowActions({ member }: { member: Profile }) {
  const [pending, start] = useTransition();
  function role(r: UserRole) {
    start(async () => {
      const res = await setUserRole(member.id, r);
      if (res.error) toast.error(res.error); else toast.success("Role updated");
    });
  }
  function deactivate() {
    if (!confirm("Deactivate this user? They will lose access.")) return;
    start(async () => {
      const res = await deactivateUser(member.id);
      if (res.error) toast.error(res.error); else toast.success("Deactivated");
    });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" disabled={pending}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => role("admin")}>Make admin</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => role("sales_manager")}>Make sales manager</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => role("sales_agent")}>Make sales agent</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => role("field_executive")}>Make field executive</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => role("social_media_manager")}>Make social media manager</DropdownMenuItem>
        <DropdownMenuItem onSelect={deactivate} className="text-destructive">Deactivate</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
