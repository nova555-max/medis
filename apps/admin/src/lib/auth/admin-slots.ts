import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Max owner-admin accounts that may self-register via /register */
export const MAX_ADMIN_ACCOUNTS = 2;

export type AdminRegistrationStatus = {
  used: number;
  maxAllowed: number;
  open: boolean;
};

export async function getAdminRegistrationStatus(): Promise<AdminRegistrationStatus> {
  const maxAllowed = MAX_ADMIN_ACCOUNTS;

  // Prefer service-role count (authoritative, works without RPC)
  try {
    const service = createServiceClient();
    const { count, error } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (!error) {
      const used = count ?? 0;
      return { used, maxAllowed, open: used < maxAllowed };
    }
  } catch {
    // fall through
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_registration_slots");
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const used = Number((row as { used?: number }).used ?? 0);
        const max = Number(
          (row as { max_allowed?: number }).max_allowed ?? maxAllowed,
        );
        return { used, maxAllowed: max, open: used < max };
      }
    }
  } catch {
    // fall through
  }

  // Bootstrap fail-open: allow register UI when we cannot count (DB still enforces if RPC exists)
  return { used: 0, maxAllowed, open: true };
}
