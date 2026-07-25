/**
 * Prints SQL for 00026 — run in Supabase SQL Editor (ccpsitgvclhchkjsyvlo).
 * Or paste contents of supabase/migrations/00026_auto_device_switch_notify.sql
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sqlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
  "00026_auto_device_switch_notify.sql",
);
console.log(fs.readFileSync(sqlPath, "utf8"));
console.log(
  "\n-- Paste the above into Supabase SQL Editor for project ccpsitgvclhchkjsyvlo",
);
