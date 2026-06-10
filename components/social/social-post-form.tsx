"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSocialPost, draftCaption } from "@/lib/db/actions";
import { toast } from "sonner";
import { Sparkles, Plus, ChevronDown } from "lucide-react";

export function SocialPostForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");

  function aiDraft() {
    start(async () => {
      const t = title || "New listing in Gurgaon";
      const r = await draftCaption(t);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((r as any).text) setCaption((r as any).text);
      else toast.error("AI unavailable");
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createSocialPost({
        title: fd.get("title"),
        post_type: fd.get("post_type"),
        caption,
        media_urls: [],
        status: fd.get("status"),
        scheduled_at: (fd.get("scheduled_at") as string) ? new Date(fd.get("scheduled_at") as string).toISOString() : null,
        notes: fd.get("notes") || null,
      });
      if (r.error) toast.error(r.error);
      else { toast.success("Post created"); setOpen(false); setCaption(""); setTitle(""); }
    });
  }

  return (
    <Card>
      <CardHeader>
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
          <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />New post</CardTitle>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </CardHeader>
      {open && (
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="DLF Phase 4 - 3 BHK launch reel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select name="post_type" defaultValue="instagram_post">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram_reel">Instagram Reel</SelectItem>
                    <SelectItem value="instagram_post">Instagram Post</SelectItem>
                    <SelectItem value="facebook_post">Facebook</SelectItem>
                    <SelectItem value="linkedin_post">LinkedIn</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="twitter_post">Twitter / X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue="draft">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Caption</Label>
                <Button type="button" size="sm" variant="outline" onClick={aiDraft} disabled={pending}>
                  <Sparkles className="h-3 w-3 mr-1" />AI draft
                </Button>
              </div>
              <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Auto-generated or your own caption…" />
            </div>
            <div className="space-y-2">
              <Label>Scheduled at</Label>
              <Input name="scheduled_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save post"}</Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
