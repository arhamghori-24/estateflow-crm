import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock } from "./__test-utils__/supabaseMock";

const ORIGINAL_ENV = { ...process.env };

describe("emailService.send (dry-run)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.SERVICES_DRY_RUN = "true";
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const baseReq = {
    organizationId: "org-1",
    leadId: "lead-1",
    to: "rahul@example.com",
    subject: "Property details",
    body: "Here are the details you requested.",
  };

  it("creates a queued message marked is_dry_run, then marks it sent", async () => {
    const { client, calls } = createSupabaseMock({
      messages: [{ data: { id: "msg-1" }, error: null }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { emailService } = await import("./emailService");
    const result = await emailService.send(baseReq);

    expect(result).toEqual({ ok: true, dryRun: true, data: { messageId: "msg-1" } });

    const insertCall = calls.find((c) => c.table === "messages" && c.method === "insert");
    const inserted = insertCall!.args[0] as Record<string, unknown>;
    expect(inserted.is_dry_run).toBe(true);
    expect(inserted.channel).toBe("email");
    expect(inserted.direction).toBe("outbound");
    expect(inserted.status).toBe("queued");
    expect(inserted.body).toContain("Subject: Property details");

    const updateCall = calls.find((c) => c.table === "messages" && c.method === "update");
    expect((updateCall!.args[0] as Record<string, unknown>).status).toBe("sent");
  });

  it("is dry-run when RESEND_API_KEY is missing even if SERVICES_DRY_RUN=false", async () => {
    process.env.SERVICES_DRY_RUN = "false";
    delete process.env.RESEND_API_KEY;

    const { client, calls } = createSupabaseMock({
      messages: [{ data: { id: "msg-1" }, error: null }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { emailService } = await import("./emailService");
    const result = await emailService.send(baseReq);

    expect(result.dryRun).toBe(true);
    const inserted = calls.find((c) => c.table === "messages" && c.method === "insert")!.args[0] as Record<string, unknown>;
    expect(inserted.is_dry_run).toBe(true);
  });

  it("returns ok:false if the message record fails to insert", async () => {
    const { client } = createSupabaseMock({
      messages: [{ data: null, error: { message: "insert failed" } }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { emailService } = await import("./emailService");
    const result = await emailService.send(baseReq);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("insert failed");
  });
});
