import { NextResponse } from "next/server";
import { MAX_ADMIN_ACCOUNTS } from "@/lib/auth/admin-slots";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";

/** Non-secret health check for registration env on Netlify. */
export async function GET() {
  const host = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0];

  let adminCount: number | null = null;
  let serviceError: string | null = null;

  if (hasServiceRoleKey()) {
    try {
      const service = createServiceClient();
      const { count, error } = await service
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (error) serviceError = error.message;
      else adminCount = count ?? 0;
    } catch (e) {
      serviceError = e instanceof Error ? e.message : "unknown";
    }
  }

  return NextResponse.json({
    ok: true,
    supabaseHost: host || null,
    hasServiceRole: hasServiceRoleKey(),
    adminCount,
    serviceError,
    maxAdminAccounts: MAX_ADMIN_ACCOUNTS,
    buildId: process.env.MEDIA_OFFICE_BUILD_ID || null,
  });
}
