import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock } from "./__test-utils__/supabaseMock";
import type { CallBridgeRequest } from "./types";

const ORIGINAL_ENV = { ...process.env };

describe("callService.initiateBridge (dry-run)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.SERVICES_DRY_RUN = "true";
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const baseReq: CallBridgeRequest = {
    organizationId: "org-1",
    leadId: "lead-1",
    leadPhone: "+919999999999",
    leadName: "Rahul Sharma",
    source: "36_acre",
    agentId: "agent-1",
    agentPhone: "+919888888888",
  };

  it("creates a call record marked is_dry_run and returns ok", async () => {
    const { client, calls } = createSupabaseMock({
      calls: [{ data: { id: "call-1" }, error: null }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { callService } = await import("./callService");
    const result = await callService.initiateBridge(baseReq);

    expect(result).toEqual({ ok: true, dryRun: true, data: { callId: "call-1" } });

    const insertCall = calls.find((c) => c.table === "calls" && c.method === "insert");
    expect(insertCall).toBeTruthy();
    const insertedRow = insertCall!.args[0] as Record<string, unknown>;
    expect(insertedRow.is_dry_run).toBe(true);
    expect(insertedRow.organization_id).toBe("org-1");
    expect(insertedRow.lead_id).toBe("lead-1");
    expect(insertedRow.agent_id).toBe("agent-1");
    expect(insertedRow.status).toBe("initiated");
  });

  it("marks the dry-run call as completed/connected with a simulated duration", async () => {
    const { client, calls } = createSupabaseMock({
      calls: [{ data: { id: "call-1" }, error: null }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { callService } = await import("./callService");
    await callService.initiateBridge(baseReq);

    const updateCall = calls.find((c) => c.table === "calls" && c.method === "update");
    expect(updateCall).toBeTruthy();
    const update = updateCall!.args[0] as Record<string, unknown>;
    expect(update.status).toBe("completed");
    expect(update.outcome).toBe("connected");
    expect(update.duration_seconds).toBe(42);
  });

  it("logs call_started and call_ended activities", async () => {
    const { client, calls } = createSupabaseMock({
      calls: [{ data: { id: "call-1" }, error: null }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { callService } = await import("./callService");
    await callService.initiateBridge(baseReq);

    const activityInserts = calls.filter((c) => c.table === "activities" && c.method === "insert");
    expect(activityInserts).toHaveLength(2);
    expect((activityInserts[0].args[0] as Record<string, unknown>).type).toBe("call_started");
    expect((activityInserts[1].args[0] as Record<string, unknown>).type).toBe("call_ended");
  });

  it("returns ok:false if the call record fails to insert", async () => {
    const { client } = createSupabaseMock({
      calls: [{ data: null, error: { message: "insert failed" } }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { callService } = await import("./callService");
    const result = await callService.initiateBridge(baseReq);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("insert failed");
  });

  it("treats requests as dry-run when TWILIO_ACCOUNT_SID is missing, even if SERVICES_DRY_RUN=false", async () => {
    process.env.SERVICES_DRY_RUN = "false";
    delete process.env.TWILIO_ACCOUNT_SID;

    const { client, calls } = createSupabaseMock({
      calls: [{ data: { id: "call-1" }, error: null }],
    });
    vi.doMock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));

    const { callService } = await import("./callService");
    const result = await callService.initiateBridge(baseReq);

    expect(result.dryRun).toBe(true);
    const insertedRow = calls.find((c) => c.table === "calls" && c.method === "insert")!.args[0] as Record<string, unknown>;
    expect(insertedRow.is_dry_run).toBe(true);
  });
});
