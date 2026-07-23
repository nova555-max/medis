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
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_registration_slots");
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const used = Number((row as { used?: number }).used ?? 0);
        const maxAllowed = Number(
          (row as { max_allowed?: number }).max_allowed ?? MAX_ADMIN_ACCOUNTS,
        );
        const open = Boolean((row as { open?: boolean }).open);
        return { used, maxAllowed, open };
      }
    }
  } catch {
    // fall through to service count
  }

  try {
    const service = createServiceClient();
    const { count, error } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) {
      return { used: 0, maxAllowed: MAX_ADMIN_ACCOUNTS, open: false };
    }
    const used = count ?? 0;
    return {
      used,
      maxAllowed: MAX_ADMIN_ACCOUNTS,
      open: used < MAX_ADMIN_ACCOUNTS,
    };
  } catch {
    return { used: 0, maxAllowed: MAX_ADMIN_ACCOUNTS, open: false };
  }
}
