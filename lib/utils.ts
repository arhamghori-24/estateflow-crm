import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatBudgetRange(min: number | null, max: number | null): string {
  if (!min && !max) return "Budget not set";
  if (!min) return `Up to ${formatCurrency(max)}`;
  if (!max) return `From ${formatCurrency(min)}`;
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

export function formatPhone(p: string): string {
  return p.replace(/\s+/g, "").replace(/(\+\d{2})(\d{5})(\d{5})/, "$1 $2 $3");
}

export function initials(name: string): string {
  return name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function timeAgo(date: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function todayRange(): { start: string; end: string } {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function isDryRun(): boolean {
  return (process.env.SERVICES_DRY_RUN ?? "true").toLowerCase() === "true";
}

/** Best-effort masking of secrets. NOT real encryption — replace with KMS/Vault in production. */
export function maskSecret(s: string | null | undefined): string {
  if (!s) return "—";
  if (s.length <= 8) return "••••";
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

/**
 * Connection status for external services, derived from env vars (the actual
 * source of truth read by lib/services/*). Used by the Integrations page so
 * it reflects reality instead of the unused integration_settings columns.
 */
export function getIntegrationEnvStatus() {
  return {
    twilio: {
      configured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
      accountSid: maskSecret(process.env.TWILIO_ACCOUNT_SID),
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "—",
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER ?? "—",
    },
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      apiKey: maskSecret(process.env.RESEND_API_KEY),
      fromEmail: process.env.RESEND_FROM_EMAIL ?? "—",
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      apiKey: maskSecret(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL ?? "—",
    },
    dryRun: isDryRun(),
  };
}
