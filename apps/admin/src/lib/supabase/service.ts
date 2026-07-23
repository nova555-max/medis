import { createClient } from "@supabase/supabase-js";
import {
  assertServiceRoleKey,
  getPublicSupabaseEnv,
  getServiceRoleKey,
} from "@/lib/supabase/env";

export function hasServiceRoleKey() {
  const { url } = getPublicSupabaseEnv();
  return Boolean(url && getServiceRoleKey());
}

/** Service-role client for privileged auth ops. Server-only — never expose to browser. */
export function createServiceClient() {
  const { url } = getPublicSupabaseEnv();
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ENV_MISSING");
  }
  const problem = assertServiceRoleKey(url, key);
  if (problem) {
    throw new Error(`SUPABASE_SERVICE_KEY_INVALID: ${problem}`);
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
