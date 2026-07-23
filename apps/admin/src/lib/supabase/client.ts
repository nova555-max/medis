import { createBrowserClient } from "@supabase/ssr";
import { assertAnonKey, getPublicSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv();
  if (!ok) {
    throw new Error("SUPABASE_ENV_MISSING");
  }
  const problem = assertAnonKey(url, anonKey);
  if (problem) {
    throw new Error(`SUPABASE_ANON_KEY_INVALID: ${problem}`);
  }
  return createBrowserClient(url, anonKey);
}
