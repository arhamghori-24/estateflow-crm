import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Image as ImageIcon, Calendar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SocialPostForm } from "@/components/social/social-post-form";
import { SocialPostActions } from "@/components/social/social-post-actions";

const STATUS_TONE = { idea: "outline", draft: "secondary", scheduled: "warning", published: "success", failed: "destructive" } as const;

export default async function SocialPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("social_posts")
    .select("*, profiles:assigned_to(full_name)")
    .eq("organization_id", profile.organization_id)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped: Record<string, any[]> = { idea: [], draft: [], scheduled: [], published: [] };
  (posts ?? []).forEach((p) => { grouped[p.status]?.push(p); });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Social Media</h1>
          <p className="text-sm text-muted-foreground">Content calendar & post drafts</p>
        </div>
      </div>

      <SocialPostForm />

      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled ({grouped.scheduled?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({grouped.draft?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="idea">Ideas ({grouped.idea?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="published">Published ({grouped.published?.length ?? 0})</TabsTrigger>
        </TabsList>
        {Object.entries(grouped).map(([key, list]) => (
          <TabsContent key={key} value={key} className="space-y-2">
            {list.length === 0 ? (
              <EmptyState icon={ImageIcon} title={`No ${key} posts`} />
            ) : list.map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{p.title}</p>
                        <Badge variant={STATUS_TONE[p.status as keyof typeof STATUS_TONE]} className="capitalize">{p.status}</Badge>
                        <Badge variant="outline" className="capitalize">{p.post_type.replace("_", " ")}</Badge>
                      </div>
                      {p.caption && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.caption}</p>}
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        {p.scheduled_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.scheduled_at).toLocaleString()}</span>}
                        {p.profiles?.full_name && <span>→ {p.profiles.full_name}</span>}
                      </div>
                    </div>
                    <SocialPostActions post={p} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
