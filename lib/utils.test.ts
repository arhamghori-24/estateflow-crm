import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  formatCurrency,
  formatBudgetRange,
  formatPhone,
  initials,
  isDryRun,
  maskSecret,
  getIntegrationEnvStatus,
} from "./utils";

describe("formatCurrency", () => {
  it("formats crores", () => {
    expect(formatCurrency(12000000)).toBe("₹1.20 Cr");
  });

  it("formats lakhs", () => {
    expect(formatCurrency(750000)).toBe("₹7.50 L");
  });

  it("formats below a lakh with locale grouping", () => {
    expect(formatCurrency(50000)).toBe("₹50,000");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });
});

describe("formatBudgetRange", () => {
  it("returns 'Budget not set' when both are missing", () => {
    expect(formatBudgetRange(null, null)).toBe("Budget not set");
  });

  it("formats an upper bound only", () => {
    expect(formatBudgetRange(null, 12000000)).toBe("Up to ₹1.20 Cr");
  });

  it("formats a lower bound only", () => {
    expect(formatBudgetRange(7500000, null)).toBe("From ₹75.00 L");
  });

  it("formats a full range", () => {
    expect(formatBudgetRange(7500000, 12000000)).toBe("₹75.00 L – ₹1.20 Cr");
  });
});

describe("formatPhone", () => {
  it("inserts spacing for a +XX XXXXX XXXXX style number", () => {
    expect(formatPhone("+919999999999")).toBe("+91 99999 99999");
  });

  it("strips existing whitespace before formatting", () => {
    expect(formatPhone("+91 99999 99999")).toBe("+91 99999 99999");
  });
});

describe("initials", () => {
  it("returns up to two uppercase initials", () => {
    expect(initials("Rahul Sharma")).toBe("RS");
  });

  it("handles a single name", () => {
    expect(initials("Rahul")).toBe("R");
  });

  it("ignores extra whitespace", () => {
    expect(initials("  Rahul   Sharma  ")).toBe("RS");
  });
});

describe("maskSecret", () => {
  it("returns an em dash for empty input", () => {
    expect(maskSecret(null)).toBe("—");
    expect(maskSecret(undefined)).toBe("—");
    expect(maskSecret("")).toBe("—");
  });

  it("fully masks short secrets", () => {
    expect(maskSecret("short")).toBe("••••");
  });

  it("shows first/last 4 chars of long secrets", () => {
    expect(maskSecret("ACtestaccountsidaaaaaaaaaaaaaaaaaa")).toBe("ACte••••aaaa");
  });

  it("matches the documented prefix/suffix format", () => {
    const secret = "re_test_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const masked = maskSecret(secret);
    expect(masked.startsWith(secret.slice(0, 4))).toBe(true);
    expect(masked.endsWith(secret.slice(-4))).toBe(true);
    expect(masked).toContain("••••");
  });
});

describe("isDryRun / getIntegrationEnvStatus", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to true when SERVICES_DRY_RUN is unset", () => {
    delete process.env.SERVICES_DRY_RUN;
    expect(isDryRun()).toBe(true);
  });

  it("is false only when explicitly set to 'false'", () => {
    process.env.SERVICES_DRY_RUN = "false";
    expect(isDryRun()).toBe(false);
  });

  it("is false for any value other than 'true' (e.g. typos)", () => {
    process.env.SERVICES_DRY_RUN = "nope";
    expect(isDryRun()).toBe(false);
  });

  it("reports each integration as configured based on env vars", () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.RESEND_API_KEY = "re_xxx";
    process.env.OPENAI_API_KEY = "sk-xxx";
    process.env.SERVICES_DRY_RUN = "false";

    const status = getIntegrationEnvStatus();
    expect(status.twilio.configured).toBe(true);
    expect(status.resend.configured).toBe(true);
    expect(status.openai.configured).toBe(true);
    expect(status.dryRun).toBe(false);
  });

  it("reports integrations as not configured when env vars are missing", () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.RESEND_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const status = getIntegrationEnvStatus();
    expect(status.twilio.configured).toBe(false);
    expect(status.resend.configured).toBe(false);
    expect(status.openai.configured).toBe(false);
  });
});
