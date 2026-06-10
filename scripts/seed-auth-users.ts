/**
 * Creates demo auth users via Supabase Admin API.
 *
 * Usage:
 *   npx tsx scripts/seed-auth-users.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * After this runs, execute the SQL seed to link profiles + insert sample data:
 *   psql "$DATABASE_URL" -f supabase/seed.sql
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const USERS = [
  { email: "admin@estateflow.test", password: "Password123!", name: "Aarav Mehta (Admin)" },
  { email: "manager@estateflow.test", password: "Password123!", name: "Neha Kapoor" },
  { email: "agent1@estateflow.test", password: "Password123!", name: "Rohit Verma" },
  { email: "agent2@estateflow.test", password: "Password123!", name: "Priya Sharma" },
  { email: "field@estateflow.test", password: "Password123!", name: "Karan Singh" },
  { email: "social@estateflow.test", password: "Password123!", name: "Aisha Khan" },
];

async function main() {
  for (const u of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });
    if (error && !error.message.includes("already")) {
      console.error(`Failed to create ${u.email}:`, error.message);
    } else {
      console.log(`OK ${u.email}  (id=${data?.user?.id ?? "exists"})`);
    }
  }
  console.log("\nDone. Now run: psql \"$DATABASE_URL\" -f supabase/seed.sql");
}
main().catch((e) => { console.error(e); process.exit(1); });
