"use client";
import Link from "next/link";
import { Bell, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

export function TopBar({ profile, unreadCount = 0 }: { profile: Profile; unreadCount?: number }) {
  const router = useRouter();
  const supabase = createClient();
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur safe-top">
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">E</div>
        <span className="font-semibold">EstateFlow</span>
      </Link>
      <div className="md:flex-1" />
      <div className="flex items-center gap-1">
        <Link href="/notifications" className="relative">
          <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]">{unreadCount}</Badge>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8"><AvatarFallback>{initials(profile.full_name)}</AvatarFallback></Avatar>
              <span className="hidden md:block text-sm font-medium">{profile.full_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/more/settings"><User className="mr-2 h-4 w-4" />Profile & Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
