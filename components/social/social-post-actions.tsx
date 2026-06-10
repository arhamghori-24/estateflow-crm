"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { publishSocialPost } from "@/lib/db/actions";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SocialPostActions({ post }: { post: any }) {
  const [pending, start] = useTransition();
  function publish() {
    start(async () => {
      const r = await publishSocialPost(post.id);
      if (r.error) toast.error(r.error);
      else toast.success(r.dryRun ? "Marked published (dry-run)" : "Published / forwarded");
    });
  }
  if (post.status === "published") return null;
  return (
    <Button size="sm" variant="outline" onClick={publish} disabled={pending}>
      <Send className="h-3 w-3 mr-1" />Publish
    </Button>
  );
}
