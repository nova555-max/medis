import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Exchanges the auth code from the password-reset email for a session,
 * then redirects to /reset-password (or `next` query).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") || "/reset-password";
  const next = nextRaw.startsWith("/") ? nextRaw : "/reset-password";
  const errorDesc = searchParams.get("error_description") || searchParams.get("error");

  if (errorDesc) {
    const url = new URL("/forgot-password", origin);
    url.searchParams.set("error", "link_invalid");
    return NextResponse.redirect(url);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, origin));
      }
    } catch {
      // fall through
    }
  }

  const fail = new URL("/forgot-password", origin);
  fail.searchParams.set("error", "link_invalid");
  return NextResponse.redirect(fail);
}
