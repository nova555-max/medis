import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";

/** Max owner-admin accounts that may self-register via /register */
export const MAX_ADMIN_ACCOUNTS = 20;

export type AdminRegistrationStatus = {
  used: number;
  maxAllowed: number;
  open: boolean;
  /** False when we could not read the real count (do not show fake remaining slots). */
  known: boolean;
};

export async function getAdminRegistrationStatus(): Promise<AdminRegistrationStatus> {
  const maxAllowed = MAX_ADMIN_ACCOUNTS;

  if (hasServiceRoleKey()) {
    try {
      const service = createServiceClient();
      const { count, error } = await service
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (!error) {
        const used = count ?? 0;
        return { used, maxAllowed, open: used < maxAllowed, known: true };
      }
      // Retry without head in case the edge/runtime mishandles count-only
      const { data, error: listError } = await service
        .from("profiles")
        .select("id")
        .eq("role", "admin");
      if (!listError) {
        const used = data?.length ?? 0;
        return { used, maxAllowed, open: used < maxAllowed, known: true };
      }
    } catch {
      // fall through
    }
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
        return {
          used,
          maxAllowed: max,
          open: used < max,
          known: true,
        };
      }
    }
  } catch {
    // fall through
  }

  // Unknown: keep form open, but UI must not claim "2 of 2 remaining"
  return { used: 0, maxAllowed, open: true, known: false };
}
