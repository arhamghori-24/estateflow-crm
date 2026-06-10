import { describe, it, expect } from "vitest";
import {
  phoneSchema,
  leadWebhookSchema,
  leadCreateSchema,
  normalizeSource,
  sourceMapping,
} from "./schemas";

describe("phoneSchema", () => {
  it("accepts a plain international number", () => {
    expect(phoneSchema.parse("+919999999999")).toBe("+919999999999");
  });

  it("strips spaces and dashes", () => {
    expect(phoneSchema.parse("+91 99999-99999")).toBe("+919999999999");
  });

  it("rejects numbers that are too short", () => {
    expect(() => phoneSchema.parse("12345")).toThrow();
  });

  it("rejects non-numeric characters", () => {
    expect(() => phoneSchema.parse("+91abcde9999")).toThrow();
  });
});

describe("normalizeSource", () => {
  it("maps known portal names to canonical sources", () => {
    expect(normalizeSource("36 Acre")).toBe("36_acre");
    expect(normalizeSource("36acre")).toBe("36_acre");
    expect(normalizeSource("MagicBricks")).toBe("magicbricks");
    expect(normalizeSource("Magic Bricks")).toBe("magicbricks");
    expect(normalizeSource("Housing")).toBe("housing");
    expect(normalizeSource("housing.com")).toBe("housing");
    expect(normalizeSource("Facebook")).toBe("facebook");
    expect(normalizeSource("fb")).toBe("facebook");
    expect(normalizeSource("Instagram")).toBe("instagram");
    expect(normalizeSource("ig")).toBe("instagram");
    expect(normalizeSource("Website")).toBe("website");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeSource("  FACEBOOK  ")).toBe("facebook");
  });

  it("falls back to 'other' for unrecognized sources", () => {
    expect(normalizeSource("Zillow")).toBe("other");
    expect(normalizeSource("")).toBe("other");
    expect(normalizeSource(null)).toBe("other");
    expect(normalizeSource(undefined)).toBe("other");
  });

  it("covers every entry in sourceMapping", () => {
    for (const [input, expected] of Object.entries(sourceMapping)) {
      expect(normalizeSource(input)).toBe(expected);
    }
  });
});

describe("leadWebhookSchema", () => {
  const basePayload = {
    fullName: "Rahul Sharma",
    phone: "+919999999999",
    email: "rahul@example.com",
    source: "36 Acre",
    propertyType: "Apartment",
    budgetMin: 7500000,
    budgetMax: 12000000,
    preferredLocation: "Gurgaon",
    notes: "Looking for 3BHK near Golf Course Road",
  };

  it("accepts a fully populated payload", () => {
    const result = leadWebhookSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it("requires fullName and phone", () => {
    const { fullName, phone, ...rest } = basePayload;
    void fullName;
    void phone;
    const result = leadWebhookSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("defaults source to 'other' when omitted", () => {
    const { source, ...rest } = basePayload;
    void source;
    const result = leadWebhookSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.source).toBe("other");
  });

  it("rejects an invalid email", () => {
    const result = leadWebhookSchema.safeParse({ ...basePayload, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("coerces numeric budget strings", () => {
    const result = leadWebhookSchema.safeParse({ ...basePayload, budgetMin: "7500000", budgetMax: "12000000" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetMin).toBe(7500000);
      expect(result.data.budgetMax).toBe(12000000);
    }
  });

  it("rejects negative budgets", () => {
    const result = leadWebhookSchema.safeParse({ ...basePayload, budgetMin: -100 });
    expect(result.success).toBe(false);
  });
});

describe("leadCreateSchema", () => {
  it("defaults source to manual and temperature to warm", () => {
    const result = leadCreateSchema.safeParse({
      full_name: "Asha Mehta",
      phone: "+919876543210",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("manual");
      expect(result.data.temperature).toBe("warm");
    }
  });

  it("rejects an invalid assigned_agent_id (must be uuid)", () => {
    const result = leadCreateSchema.safeParse({
      full_name: "Asha Mehta",
      phone: "+919876543210",
      assigned_agent_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
