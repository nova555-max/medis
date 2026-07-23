import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isServerAction(request: NextRequest) {
  return (
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.has("Next-Action") ||
      Boolean(request.headers.get("content-type")?.includes("multipart/form-data")) ||
      Boolean(request.headers.get("content-type")?.includes("text/plain")))
  );
}

function isMobileUserAgent(ua: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(
    ua,
  );
}

function isStaff(role: string | undefined) {
  return role === "admin" || role === "manager";
}

/** Wipe legacy cookie that used to force /login → /employee/login */
function clearLegacySurfaceCookie(res: NextResponse) {
  res.cookies.set("mo_surface", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return clearLegacySurfaceCookie(supabaseResponse);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Only /employee and /employee/... — never /employees (admin)
  const isEmployeeRoute =
    path === "/employee" || path.startsWith("/employee/");
  const isEmployeeLogin = path === "/employee/login";
  const isEmployeeForgot = path === "/employee/forgot-password";
  const isEmployeeBlocked = path === "/employee/desktop-blocked";
  const isAdminAuth =
    path === "/login" ||
    path.startsWith("/login/") ||
    path.startsWith("/register") ||
    path.startsWith("/verify-register") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/verify-otp") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth/");
  const actionRequest = isServerAction(request);
  const allowDesktopEmployee =
    process.env.ALLOW_EMPLOYEE_DESKTOP === "1" ||
    request.cookies.get("mo_allow_desktop")?.value === "1";
  const ua = request.headers.get("user-agent") || "";
  const mobileOk = allowDesktopEmployee || isMobileUserAgent(ua);

  // ===================== EMPLOYEE (/employee/*) =====================
  if (isEmployeeRoute) {
    if (isEmployeeBlocked) {
      return clearLegacySurfaceCookie(supabaseResponse);
    }

    if (!mobileOk) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/desktop-blocked";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }

    if (isEmployeeLogin || isEmployeeForgot) {
      if (user && !actionRequest && isEmployeeLogin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role === "employee" && profile.is_active) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/employee";
          return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
        }
        if (isStaff(profile?.role) && profile?.is_active) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/";
          return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
        }
      }
      return clearLegacySurfaceCookie(supabaseResponse);
    }

    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (isStaff(profile?.role) && profile?.is_active) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }

    if (!profile || profile.role !== "employee" || !profile.is_active) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      redirectUrl.searchParams.set("error", "employee_only");
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }

    return clearLegacySurfaceCookie(supabaseResponse);
  }

  // ===================== ADMIN (path-based only) =====================
  // Never redirect /login based on cookies.
  if (isAdminAuth) {
    const isPasswordFlow =
      path.startsWith("/forgot-password") ||
      path.startsWith("/verify-otp") ||
      path.startsWith("/verify-register") ||
      path.startsWith("/reset-password") ||
      path.startsWith("/auth/");

    if (user && !actionRequest && !isPasswordFlow) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "employee" && profile.is_active) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/employee";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }
      if (isStaff(profile?.role) && profile?.is_active) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }
    }
    return clearLegacySurfaceCookie(supabaseResponse);
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "employee" && profile.is_active) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/employee";
    return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
  }

  if (!profile || !isStaff(profile.role) || !profile.is_active) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "admin_only");
    return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
  }

  if (profile.role === "manager") {
    const blocked =
      path.startsWith("/settings") ||
      path.startsWith("/backups") ||
      path.startsWith("/activity-logs");
    if (blocked) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }
  }

  return clearLegacySurfaceCookie(supabaseResponse);
}
