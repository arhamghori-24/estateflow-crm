# EstateFlow CRM

A mobile-first Real Estate CRM. Built for sales teams who get leads from 36 Acre, MagicBricks, Housing.com, Facebook Ads, Instagram Ads, website forms, WhatsApp, and manual entries.

**The killer feature:** the instant agent-to-lead bridge call. The moment a new lead hits `/api/webhooks/leads`, the system dials the assigned agent first, then bridges them with the lead on a live call — all logged automatically.

## Tech stack

- **Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui
- **Backend:** Next.js Server Actions + API routes
- **DB / Auth / Storage / Realtime:** Supabase (Postgres with RLS)
- **Voice / SMS / WhatsApp:** Twilio
- **Email:** Resend (with SMTP fallback adapter)
- **Maps:** Browser geolocation for attendance
- **AI:** OpenAI-compatible adapter (for social captions / message drafting)
- **Deploy:** Vercel

## Modules

| Module | Status |
| --- | --- |
| Auth (login, signup, invites) + 5 roles | ✅ |
| Multi-tenant orgs with RLS isolation | ✅ |
| Dashboard with metrics + activity feed | ✅ |
| Leads CRUD, filters, timeline, quick actions | ✅ |
| Lead webhook (36 Acre / MagicBricks / Facebook / Zapier) | ✅ |
| Round-robin / least-busy agent assignment | ✅ |
| Twilio bridge call (with dry-run mode) | ✅ |
| Property inventory + photo uploads | ✅ |
| One-click property share via WhatsApp / SMS / email | ✅ |
| Public property share pages (`/share/property/:token`) | ✅ |
| One-click WhatsApp / SMS / Email follow-ups | ✅ |
| Follow-up scheduling, snoozing, templates | ✅ |
| Attendance (GPS check-in / out) | ✅ |
| Social media calendar + AI caption drafts + publish webhook | ✅ |
| Team management + invites | ✅ |
| Reports (sources, statuses, agent perf, attendance) | ✅ |
| Integrations settings (Twilio, Resend, OpenAI, webhook secrets) | ✅ |
| In-app notifications | ✅ |

---

## Local setup

### 1. Prerequisites

- Node 20+
- A Supabase project (free tier works) — https://supabase.com
- (Optional) Twilio + Resend + OpenAI accounts for production use

Without any external keys, everything runs in **dry-run mode** — calls and messages are logged to the DB but not actually sent. This is the default.

### 2. Clone & install

```bash
pnpm install   # or npm install / yarn
cp .env.example .env.local
```

Fill in at minimum:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgres://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
LEAD_WEBHOOK_SECRET=any-long-random-string
CRON_SECRET=any-long-random-string
SERVICES_DRY_RUN=true   # keep true until Twilio is configured
```

### 3. Set up the database

Apply the migrations in order (via Supabase Studio SQL editor or psql):

```bash
psql "$DATABASE_URL" -f supabase/migrations/00001_init_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/00002_rls_policies.sql
psql "$DATABASE_URL" -f supabase/migrations/00003_storage_buckets.sql
```

If you have the Supabase CLI:
```bash
supabase link --project-ref YOUR-REF
supabase db push
```

### 4. (Optional) Seed demo data

Two-step seed:

```bash
# 1. Create demo auth users (requires SUPABASE_SERVICE_ROLE_KEY)
pnpm dlx tsx scripts/seed-auth-users.ts

# 2. Insert demo org, profiles, 10 properties, 20 leads, follow-ups, calls, attendance, social posts
psql "$DATABASE_URL" -f supabase/seed.sql
```

Demo login:
- `admin@estateflow.test` / `Password123!` — Admin
- `manager@estateflow.test` / `Password123!` — Sales Manager
- `agent1@estateflow.test` / `Password123!` — Sales Agent (round-robin pool)
- `agent2@estateflow.test` / `Password123!` — Sales Agent
- `field@estateflow.test` / `Password123!` — Field Executive
- `social@estateflow.test` / `Password123!` — Social Media Manager

### 5. Run

```bash
pnpm dev
# open http://localhost:3000
```

---

## Lead webhook (testing)

The endpoint is `POST /api/webhooks/leads`. Authentication is via the header
`x-webhook-secret: <your secret>` plus `?org=<your-org-id>`.

You can find the exact URL on the **Integrations** page (admin only).

### Example with curl

```bash
curl -X POST "http://localhost:3000/api/webhooks/leads?org=<ORG_ID>" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $LEAD_WEBHOOK_SECRET" \
  -d '{
    "fullName": "Rahul Sharma",
    "phone": "+919999999999",
    "email": "rahul@example.com",
    "source": "36 Acre",
    "propertyType": "Apartment",
    "budgetMin": 7500000,
    "budgetMax": 12000000,
    "preferredLocation": "Gurgaon",
    "notes": "Looking for 3BHK near Golf Course Road"
  }'
```

What happens:

1. Lead is inserted (`status=new`).
2. Round-robin picks an available `sales_agent`.
3. `callService.initiateBridge()` fires. In **dry-run mode** the call record is created + completed instantly with `is_dry_run=true`.
4. An in-app notification is created for the assigned agent.
5. A `lead_created` activity is appended to the lead timeline.

You'll see the new lead at `/leads` and on the dashboard within a second.

### Mapping from external portals

The `source` field is normalized — these all work:

| Sent value | Stored as |
| --- | --- |
| `"36 Acre"`, `"36acre"` | `36_acre` |
| `"MagicBricks"`, `"Magic Bricks"` | `magicbricks` |
| `"Housing"`, `"housing.com"` | `housing` |
| `"Facebook"`, `"fb"` | `facebook` |
| `"Instagram"`, `"ig"` | `instagram` |
| `"Website"` | `website` |
| anything else | `other` |

For platforms that can't send a custom header, you can also use the query string form:

```
POST /api/webhooks/leads?org=<ORG_ID>&secret=<SECRET>
```

### Connecting to platforms

- **36 Acre / MagicBricks / Housing.com:** Most B2B portals have an "API delivery" option — paste the webhook URL there.
- **Facebook / Instagram Lead Ads:** Use Zapier or Make with the "Webhooks" action, mapping FB fields to the schema above.
- **Website forms:** Just POST from your contact form. CORS preflight is allowed.

---

## Twilio bridge call setup

In dry-run mode (default) you don't need Twilio at all — bridge calls are simulated and logged. To enable real calls:

1. **Create a Twilio account** and buy a phone number with voice capability.
2. **Get credentials:**
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` (e.g. `+14155550006`)
   - For WhatsApp: enable the sandbox or get an approved sender (`TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886`)
3. **Set `SERVICES_DRY_RUN=false`** in your env.
4. **Public URL required.** Twilio needs to reach your callback URLs:
   - `${APP_URL}/api/twilio/voice` — agent leg TwiML
   - `${APP_URL}/api/twilio/bridge` — conference setup
   - `${APP_URL}/api/twilio/status` — status callbacks
   - `${APP_URL}/api/twilio/recording` — recording webhook

   In production, set `NEXT_PUBLIC_APP_URL=https://your-domain.com`. For local Twilio testing, use [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   # set NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
   ```

5. **Flow recap:**
   - Lead comes in → `callService.initiateBridge` dials the **agent** first.
   - Agent picks up → Twilio hits `/api/twilio/voice` → we play `"New real estate lead from {source}. Press any key to connect."`
   - Agent presses a digit → `/api/twilio/bridge` puts the agent in a conference and simultaneously dials the lead into the same conference.
   - Twilio records the call and posts status to `/api/twilio/status`. We update `calls.duration_seconds`, `calls.recording_url`, `calls.outcome`.
   - If the agent doesn't answer, `callService.tryNextAgent` is invoked. If nobody answers, the lead is marked `call_pending` and managers are notified.

---

## Deployment

### Vercel

1. Push to GitHub / GitLab.
2. Import into Vercel.
3. Set all environment variables from `.env.example`.
4. **Important:** set `NEXT_PUBLIC_APP_URL` to your production URL (this is used in Twilio callback URLs and property share links).
5. Deploy.

`vercel.json` already configures a cron job: `*/15 * * * *` hits `/api/cron/followups` to generate "follow-up due" notifications.

### Supabase

Production-ready out of the box. Migrations are in `supabase/migrations/` — apply via:

```bash
supabase link --project-ref YOUR-REF
supabase db push
```

RLS is enabled on every table. The service-role key is **only** used in webhooks and admin routes — never exposed to the browser.

### Recommended next steps for hardening

- Move integration secrets out of `integration_settings.*_encrypted` into a real KMS (AWS KMS, GCP KMS, or HashiCorp Vault) — the current MVP stores them as-is, which is fine for development but should be encrypted at rest for production.
- Add Twilio request signature validation to `/api/twilio/*` routes using `twilio.validateRequest()`.
- Add rate-limiting on `/api/webhooks/leads` (e.g. via Vercel Edge Middleware or Upstash).
- Add observability: Sentry or Logflare hooked into Next.js + Supabase.

---

## Project structure

```
estateflow-crm/
├── app/
│   ├── (auth)/          # login, signup, invite (public)
│   ├── (app)/           # authenticated CRM shell (dashboard, leads, etc.)
│   ├── api/
│   │   ├── webhooks/leads/   # lead intake endpoint
│   │   ├── twilio/{voice,bridge,status,recording}/  # call bridge webhooks
│   │   ├── cron/followups/   # scheduled follow-up notifications
│   │   ├── auth/setup-org/   # creates org + first admin profile
│   │   └── invites/accept/
│   ├── share/property/[token]/  # public, unauthenticated share page
│   └── globals.css
├── components/
│   ├── ui/              # shadcn primitives
│   ├── layout/          # bottom-nav, side-nav, top-bar
│   ├── leads/           # lead-card, quick-actions, timeline, controls, recommended-properties
│   ├── properties/      # property-card, form, uploader, share-link-card
│   ├── followups/, attendance/, social/, team/, integrations/, dashboard/
├── lib/
│   ├── supabase/        # client.ts, server.ts (incl. admin), middleware.ts
│   ├── services/        # callService, messageService, emailService,
│   │                    # leadAssignmentService, propertyShareService,
│   │                    # attendanceService, socialPostService
│   ├── db/              # leads.ts, properties.ts, dashboard.ts, actions.ts
│   ├── validation/      # zod schemas
│   ├── types/           # database.ts
│   ├── auth.ts          # requireUser / requireRole
│   └── utils.ts
├── supabase/
│   ├── migrations/      # 00001_init_schema, 00002_rls_policies, 00003_storage_buckets
│   └── seed.sql
├── scripts/seed-auth-users.ts
├── middleware.ts        # auth-gates the app
└── README.md
```

## Service adapter pattern

Every external integration is wrapped in a service with two modes:

```ts
// lib/services/callService.ts
export const callService = {
  async initiateBridge(req: CallBridgeRequest) {
    const dryRun = isDryRun() || !process.env.TWILIO_ACCOUNT_SID;
    // ...persist call record...
    if (dryRun) {
      // log + mark completed instantly with is_dry_run=true
      return { ok: true, dryRun: true, data: { callId } };
    }
    // real Twilio path
  },
};
```

This means **the entire app works locally without any external keys** — every CTA still works, every record is created, and `is_dry_run=true` is set so dry-run data is distinguishable from real calls.

To go live, set `SERVICES_DRY_RUN=false` and provide the necessary keys.

---

## Acceptance checklist

- [x] User can sign up + log in
- [x] Admin can invite team members + manage roles
- [x] Lead can be created manually
- [x] Lead can be created from webhook (`POST /api/webhooks/leads`)
- [x] New webhook lead auto-assigned via round-robin
- [x] Call bridge automation fires after lead creation (real or dry-run)
- [x] Call logs saved with duration / recording URL
- [x] Agents can view assigned leads
- [x] Agents can call leads (one-click)
- [x] Agents can send property photos/details in one click (WhatsApp/SMS/email)
- [x] Agents can send follow-up messages in one click
- [x] Properties can be created + photos uploaded to Supabase Storage
- [x] Property inventory can be searched & filtered
- [x] Lead timeline shows calls, notes, shares, messages
- [x] Employees can check in / out with GPS
- [x] Admin can view team attendance
- [x] Social posts can be drafted + scheduled (+ AI caption draft)
- [x] Dashboard shows CRM metrics
- [x] Reports show source/status/agent/attendance summaries
- [x] Mobile-friendly (bottom nav, sticky actions, large tap targets)
- [x] Cloud-ready (Supabase + Vercel)
- [x] RLS multi-tenant isolation
- [x] All integrations have dry-run mode
