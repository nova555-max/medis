import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  assertAnonKey,
  getPublicSupabaseEnv,
} from "@/lib/supabase/env";

export function getSupabaseEnv() {
  return getPublicSupabaseEnv();
}

export async function createClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv();
  if (!ok || !url || !anonKey) {
    throw new Error("SUPABASE_ENV_MISSING");
  }
  const problem = assertAnonKey(url, anonKey);
  if (problem) {
    throw new Error(`SUPABASE_ANON_KEY_INVALID: ${problem}`);
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}
