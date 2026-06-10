/**
 * Lead intake webhook.
 *
 * POST /api/webhooks/leads
 *
 * Auth: header `x-webhook-secret: <shared-secret>` OR `?org=<orgId>&secret=<...>`
 * The shared secret is set per organization in integration_settings.lead_webhook_secret,
 * OR falls back to the global env LEAD_WEBHOOK_SECRET (single-tenant deployments).
 *
 * Payload (example):
 *   {
 *     "fullName": "Rahul Sharma",
 *     "phone": "+919999999999",
 *     "email": "rahul@example.com",
 *     "source": "36 Acre",
 *     "propertyType": "Apartment",
 *     "budgetMin": 7500000,
 *     "budgetMax": 12000000,
 *     "preferredLocation": "Gurgaon",
 *     "notes": "Looking for 3BHK near Golf Course Road"
 *   }
 *
 * On success: creates the lead, assigns an agent via round-robin, fires the bridge call,
 * notifies the agent in-app, and returns 201 with the new lead id.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { leadWebhookSchema, normalizeSource } from "@/lib/validation/schemas";
import { leadAssignmentService, callService } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const headerSecret = req.headers.get("x-webhook-secret");
  const querySecret = url.searchParams.get("secret");
  const orgId = url.searchParams.get("org");
  const presented = headerSecret ?? querySecret;
  if (!presented) {
    return NextResponse.json({ error: "Missing secret" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Resolve organization
  let organizationId: string | null = orgId;
  if (organizationId) {
    const { data } = await admin
      .from("integration_settings")
      .select("lead_webhook_secret")
      .eq("organization_id", organizationId)
      .single();
    if (!data || (data.lead_webhook_secret && data.lead_webhook_secret !== presented)) {
      // If org-level secret is missing, fall back to env
      if (!data?.lead_webhook_secret) {
        if (presented !== process.env.LEAD_WEBHOOK_SECRET) {
          return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
      }
    }
  } else {
    // No org param - require env-level secret + a default org lookup
    if (presented !== process.env.LEAD_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret (env)" }, { status: 401 });
    }
    const { data: orgs } = await admin.from("organizations").select("id").limit(2);
    if (!orgs || orgs.length === 0) return NextResponse.json({ error: "No organization" }, { status: 500 });
    if (orgs.length > 1) {
      return NextResponse.json({ error: "Multiple orgs - specify ?org=<id>" }, { status: 400 });
    }
    organizationId = orgs[0].id;
  }

  // organizationId is always set by this point (either from orgId param or orgs lookup above)
  const orgIdResolved = organizationId as string;

  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = leadWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const p = parsed.data;

  const propertyTypeMap: Record<string, string> = {
    apartment: "apartment", villa: "villa", plot: "plot",
    commercial: "commercial", rental: "rental",
  };

  // Pick agent
  const agentId = await leadAssignmentService.pickAgent(orgIdResolved);

  // Insert lead
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      organization_id: orgIdResolved,
      full_name: p.fullName,
      phone: p.phone,
      email: p.email ?? null,
      source: normalizeSource(p.source),
      source_meta: { raw_source: p.source, payload },
      property_type: p.propertyType ? (propertyTypeMap[p.propertyType.toLowerCase()] ?? null) : null,
      budget_min: p.budgetMin ?? null,
      budget_max: p.budgetMax ?? null,
      preferred_location: p.preferredLocation ?? null,
      notes: p.notes ?? null,
      assigned_agent_id: agentId,
      status: "new",
    })
    .select("id, source, full_name, phone")
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: leadErr?.message ?? "DB insert failed" }, { status: 500 });
  }

  // Activity + assignment log
  await admin.from("activities").insert({
    organization_id: orgIdResolved,
    type: "lead_created",
    lead_id: lead.id,
    summary: `Lead "${p.fullName}" from ${p.source ?? "unknown"} via webhook`,
  });
  if (agentId) {
    await admin.from("activities").insert({
      organization_id: orgIdResolved,
      type: "lead_assigned",
      lead_id: lead.id,
      summary: "Auto-assigned via round-robin",
    });
    await admin.from("notifications").insert({
      organization_id: orgIdResolved, user_id: agentId,
      kind: "new_lead", title: "New lead assigned to you",
      body: `${p.fullName} - tap to view`,
      link_path: `/leads/${lead.id}`,
    });
  }

  // Fire bridge call (non-blocking-ish; awaited but tiny)
  if (agentId) {
    const agentPhone = await leadAssignmentService.getAgentPhone(agentId);
    if (agentPhone) {
      await callService.initiateBridge({
        organizationId: orgIdResolved,
        leadId: lead.id,
        leadName: lead.full_name,
        leadPhone: lead.phone,
        source: lead.source,
        agentId,
        agentPhone,
      });
    }
  } else {
    // No agent available - mark Call Pending
    await admin.from("leads").update({ status: "call_pending" }).eq("id", lead.id);
  }

  return NextResponse.json({ ok: true, leadId: lead.id, assignedAgentId: agentId ?? null }, { status: 201 });
}

// Allow CORS preflight for browser-based form submissions
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
    },
  });
}
