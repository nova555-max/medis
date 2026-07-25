/**
 * Applies 00025 blacklist status constraint on the linked Supabase project.
 * Usage: node scripts/apply-blacklist-migration.mjs
 * Reads apps/admin/.env.local (does not print secrets).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "apps", "admin", ".env.local");
const raw = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = v;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(
  /\/$/,
  "",
);
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = `
alter table public.employees drop constraint if exists employees_status_check;
alter table public.employees add constraint employees_status_check
  check (status in ('active', 'archived', 'blacklisted'));
`;

// Use Supabase SQL via Management is not available with service role.
// Prefer PostgREST cannot run DDL — use pg via DATABASE_URL if present.
const dbUrl = env.DATABASE_URL || env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.log("No DATABASE_URL in .env.local.");
  console.log("Run this SQL in Supabase SQL Editor for project:", url);
  console.log(sql);
  process.exit(2);
}

const { default: pg } = await import("pg").catch(() => ({ default: null }));
if (!pg) {
  console.error("Install pg: npm i pg");
  process.exit(1);
}
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
await client.end();
console.log("Migration applied OK");
