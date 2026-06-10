# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # start dev server (http://localhost:3000)
pnpm build            # production build
pnpm lint             # next lint
pnpm typecheck        # tsc --noEmit
pnpm db:push          # apply migrations via Supabase CLI (supabase db push)
pnpm db:reset         # supabase db reset
pnpm db:seed          # psql "$DATABASE_URL" -f supabase/seed.sql
```

There is no test runner configured (`playwright` is a dependency but no test script/spec files exist yet).

To apply migrations manually (in order):
```bash
psql "$DATABASE_URL" -f supabase/migrations/00001_init_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/00002_rls_policies.sql
psql "$DATABASE_URL" -f supabase/migrations/00003_storage_buckets.sql
psql "$DATABASE_URL" -f supabase/migrations/00004_drop_unused_integration_columns.sql
```

Seed demo data (two steps):
```bash
pnpm dlx tsx scripts/seed-auth-users.ts   # creates demo auth users (needs SUPABASE_SERVICE_ROLE_KEY)
psql "$DATABASE_URL" -f supabase/seed.sql # org, profiles, properties, leads, follow-ups, calls, attendance
```

## Architecture

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres/Auth/Storage/Realtime with RLS), Twilio (voice/SMS/WhatsApp), Resend (email), OpenAI-compatible adapter (AI captions), deployed on Vercel.

### The core flow: lead → bridge call

`POST /api/webhooks/leads` (auth via `x-webhook-secret` header + `?org=<org_id>`, or `?org=&secret=` query form) is the entry point for external lead sources (36 Acre, MagicBricks, Housing.com, Facebook/Instagram via Zapier, website forms, manual). On a new lead:

1. Lead inserted with `status=new`. The `source` field gets normalized to one of `LeadSource` (e.g. `"36 Acre"` → `36_acre`, `"fb"` → `facebook`; unrecognized → `other`).
2. `leadAssignmentService` picks an agent via round-robin or least-busy.
3. `callService.initiateBridge()` fires — dials the agent first, then bridges agent + lead into a Twilio conference. In dry-run mode this is simulated and logged with `is_dry_run=true`.
4. An in-app notification is created for the assigned agent.
5. A `lead_created` activity row is appended to the lead's timeline (`activities` table drives the lead timeline UI).

Twilio webhook callbacks live under `app/api/twilio/{voice,bridge,status,recording}/`:
- `/voice` — TwiML played to the agent leg ("New lead from {source}, press any key to connect")
- `/bridge` — puts agent into a conference, dials the lead into the same conference
- `/status` — call status callbacks; updates `calls.duration_seconds`, `recording_url`, `outcome`
- If the agent doesn't pick up, `callService.tryNextAgent` retries the next agent; if nobody answers, lead is marked `call_pending` and managers are notified.

### Service adapter pattern (dry-run by default)

Every external integration (`lib/services/*`) follows the same shape:

```ts
export const callService = {
  async initiateBridge(req: CallBridgeRequest) {
    const dryRun = isDryRun() || !process.env.TWILIO_ACCOUNT_SID;
    // ...persist record to DB...
    if (dryRun) {
      // mark completed instantly, set is_dry_run=true, return early
      return { ok: true, dryRun: true, data: { ... } };
    }
    // real Twilio/Resend/etc. path
  },
};
```

`SERVICES_DRY_RUN=true` (the default) means **every CTA works without external credentials** — records are created, `is_dry_run=true` distinguishes simulated activity from real. When adding/modifying a service, preserve this dual-path structure and the `ServiceResult` return shape (`lib/services/types.ts`). Services: `callService`, `messageService`, `emailService`, `leadAssignmentService`, `propertyShareService`, `attendanceService`, `socialPostService` — all re-exported from `lib/services/index.ts`.

### Auth & multi-tenancy

- `lib/auth.ts`: `requireUser()` (redirects to `/login` if unauthenticated, to `/signup?missing-profile=1` if no profile row), `requireRole(allowed: UserRole[])` (redirects to `/dashboard?error=forbidden`), `getCurrentProfile()`.
- Five roles (`UserRole` in `lib/types/database.ts`): `admin`, `sales_manager`, `sales_agent`, `field_executive`, `social_media_manager`. Labels in `lib/constants.ts`.
- Every table is org-scoped (`organization_id`) with RLS policies (`supabase/migrations/00002_rls_policies.sql`) enforcing tenant isolation. The anon/server client (`lib/supabase/server.ts` `createClient()`) respects RLS; `createAdminClient()` (service-role) bypasses RLS and is **only** used in webhooks/cron/admin routes — never expose the service-role key to the browser.
- `middleware.ts` + `lib/supabase/middleware.ts` (`updateSession`) gate all routes except static assets.

### App structure

- `app/(auth)/` — login, signup, invite (public, unauthenticated)
- `app/(app)/` — authenticated CRM shell: dashboard, leads, properties, followups, attendance, social, team, more
- `app/api/webhooks/leads/` — lead intake (see above)
- `app/api/twilio/*` — call bridge webhooks
- `app/api/cron/followups/` — hit by Vercel cron (`*/15 * * * *`, configured in `vercel.json`) to generate "follow-up due" notifications; requires `CRON_SECRET`
- `app/api/auth/setup-org/` — creates org + first admin profile
- `app/api/invites/accept/` — accepts team invites
- `app/share/property/[token]/` — public, unauthenticated property share page

### Data layer

- `lib/types/database.ts` — hand-written types mirroring `supabase/migrations/00001_init_schema.sql`. If the schema changes, update both the migration and these types (or regenerate via `supabase gen types typescript --linked`).
- `lib/db/{leads,properties,dashboard,actions}.ts` — query/mutation helpers and Server Actions.
- `lib/validation/schemas.ts` — Zod schemas for input validation.
- Status/source/outcome enums (`LeadStatus`, `LeadSource`, `CallStatus`, `CallOutcome`, `MessageStatus`, `FollowupStatus`, `AttendanceStatus`, `SocialPostStatus`, etc.) are all defined in `lib/types/database.ts` — check there before introducing new string literals for these domains.

### Key env vars (see `.env.example`)

- `SERVICES_DRY_RUN` — toggles real vs. simulated Twilio/Resend/OpenAI calls; keep `true` unless those credentials are configured.
- `LEAD_WEBHOOK_SECRET` — required for `/api/webhooks/leads`.
- `CRON_SECRET` — required for `/api/cron/*`.
- `NEXT_PUBLIC_APP_URL` — used to construct Twilio callback URLs and property share links; must be a publicly reachable URL for real Twilio calls (use ngrok locally).
