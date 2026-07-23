import { NextResponse } from "next/server";
import { hasServiceRoleKey } from "@/lib/supabase/service";
import { MAX_ADMIN_ACCOUNTS } from "@/lib/auth/admin-slots";

/** Non-secret health check for registration env on Netlify. */
export async function GET() {
  const host = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0];

  return NextResponse.json({
    ok: true,
    supabaseHost: host || null,
    hasServiceRole: hasServiceRoleKey(),
    maxAdminAccounts: MAX_ADMIN_ACCOUNTS,
    buildId: process.env.MEDIA_OFFICE_BUILD_ID || null,
  });
}
