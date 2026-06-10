/**
 * socialPostService - manages social media posts. In MVP we do NOT publish
 * directly to social platforms; if a webhook URL is configured we POST the
 * approved post for downstream tooling (Zapier / Make / Buffer / SocialPilot).
 */
import { createAdminClient } from "@/lib/supabase/server";
import { isDryRun } from "@/lib/utils";
import type { ServiceResult } from "./types";

interface PublishRequest {
  organizationId: string;
  postId: string;
}

export const socialPostService = {
  async publishOrForward(req: PublishRequest): Promise<ServiceResult<{ forwarded: boolean }>> {
    const supabase = createAdminClient();
    const dryRun = isDryRun();

    const { data: post } = await supabase.from("social_posts").select("*").eq("id", req.postId).single();
    if (!post) return { ok: false, dryRun, error: "Post not found" };

    const { data: settings } = await supabase
      .from("integration_settings")
      .select("social_publish_webhook_url")
      .eq("organization_id", req.organizationId)
      .single();

    const webhookUrl = settings?.social_publish_webhook_url;
    let forwarded = false;

    if (webhookUrl && !dryRun) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(post),
        });
        forwarded = true;
      } catch (e) {
        console.error("[socialPostService] webhook forward failed:", e);
      }
    } else if (dryRun) {
      console.log(`[socialPostService:dry-run] Would publish/forward post ${post.id}`);
    }

    await supabase
      .from("social_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", req.postId);

    return { ok: true, dryRun, data: { forwarded } };
  },

  /** AI caption helper (OpenAI-compatible). Returns a placeholder if no key. */
  async draftCaption(topic: string): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key || isDryRun()) {
      return `[AI draft for "${topic}"]\n\nDiscover your next dream home with EstateFlow. ${topic}.\n\n#RealEstate #PropertyForSale #LuxuryLiving #DreamHome`;
    }
    try {
      const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
      const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You write short, punchy real-estate social media captions with hashtags." },
            { role: "user", content: `Write a caption for: ${topic}` },
          ],
          temperature: 0.7,
        }),
      });
      const json = await res.json();
      return json?.choices?.[0]?.message?.content ?? `(no content)`;
    } catch {
      return `(AI draft unavailable — falling back to placeholder)\n${topic}`;
    }
  },
};
