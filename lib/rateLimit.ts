/**
 * Upstash-backed rate limiting for public API routes.
 *
 * Configure via UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. If unset,
 * rate limiting is skipped (fail-open) so the route keeps working without
 * the extra dependency, matching the dry-run-by-default pattern used by
 * lib/services/*.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiter = null;
    return limiter;
  }

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "ratelimit:leads-webhook",
  });
  return limiter;
}

export interface RateLimitResult {
  limited: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

/** Returns limited=false (allow) if Upstash isn't configured. */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const rl = getLimiter();
  if (!rl) return { limited: false };

  const { success, limit, remaining, reset } = await rl.limit(identifier);
  return { limited: !success, limit, remaining, reset };
}

/** Best-effort client IP from common proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
