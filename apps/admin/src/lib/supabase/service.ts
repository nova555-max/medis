import { createClient } from "@supabase/supabase-js";

function serviceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    ""
  );
}

export function hasServiceRoleKey() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceRoleKey());
}

/** Service-role client for privileged auth ops. Server-only. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serviceRoleKey();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ENV_MISSING");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
