/**
 * Shared helpers for validating inbound Twilio webhook requests.
 *
 * Twilio signs every webhook request with X-Twilio-Signature, computed from
 * the full callback URL (as configured with Twilio) plus the POST params.
 * Validation is skipped in dry-run mode / when no auth token is configured,
 * matching the rest of the service-adapter dry-run pattern.
 */
import twilio from "twilio";
import { isDryRun } from "@/lib/utils";

/**
 * Reconstructs the externally-visible URL for this request. Behind Vercel's
 * proxy, req.url can report http/internal host, but Twilio signs against the
 * public https URL configured in the console — so prefer NEXT_PUBLIC_APP_URL.
 */
function getPublicUrl(req: Request): string {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) return `${base.replace(/\/$/, "")}${url.pathname}${url.search}`;
  return url.toString();
}

/**
 * Validates the X-Twilio-Signature header against the request URL and form
 * params. Returns `{ valid: true }` if validation passes or is skipped
 * (dry-run / no TWILIO_AUTH_TOKEN configured).
 */
export async function validateTwilioRequest(
  req: Request,
  form: FormData
): Promise<{ valid: boolean; params: Record<string, string> }> {
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = String(value);
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (isDryRun() || !authToken) {
    return { valid: true, params };
  }

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = getPublicUrl(req);
  const valid = twilio.validateRequest(authToken, signature, url, params);
  return { valid, params };
}
