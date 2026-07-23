import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmployeePortalAllowed } from "@/lib/auth/mobile";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

function isServerAction(request: NextRequest) {
  return (
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.has("Next-Action") ||
      Boolean(request.headers.get("content-type")?.includes("multipart/form-data")) ||
      Boolean(request.headers.get("content-type")?.includes("text/plain")))
  );
}

function isStaff(role: string | undefined) {
  return role === "admin" || role === "manager";
}

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

  const { url, anonKey: key } = getPublicSupabaseEnv();
  const path = request.nextUrl.pathname;

  // Skip auth entirely for static/API — was calling getUser() first (major latency)
  if (
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path === "/favicon.ico"
  ) {
    return clearLegacySurfaceCookie(supabaseResponse);
  }

  if (!url || !key) {
    return clearLegacySurfaceCookie(supabaseResponse);
  }

  // Legacy email-OTP route — hard-redirect before auth round-trip
  if (path === "/verify-register" || path.startsWith("/verify-register/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/register";
    redirectUrl.search = "";
    return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
  }

  const isEmployeeRoute =
    path === "/employee" || path.startsWith("/employee/");
  const isEmployeeLogin = path === "/employee/login";
  const isEmployeeForgot = path === "/employee/forgot-password";
  const isEmployeeBlocked = path === "/employee/desktop-blocked";
  const isAdminLogin = path === "/login" || path.startsWith("/login/");
  const isAdminAuth =
    isAdminLogin ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/verify-otp") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth/");
  const actionRequest = isServerAction(request);
  const ua = request.headers.get("user-agent") || "";
  const mobileOk = isEmployeePortalAllowed(ua);

  // No session cookie → skip Supabase auth round-trip on public pages
  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth")),
    );

  if (!hasSessionCookie) {
    if (isEmployeeBlocked) {
      return clearLegacySurfaceCookie(supabaseResponse);
    }
    if (isEmployeeRoute) {
      if (!mobileOk) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/employee/desktop-blocked";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }
      if (isEmployeeLogin || isEmployeeForgot) {
        return clearLegacySurfaceCookie(supabaseResponse);
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }
    if (isAdminAuth) {
      return clearLegacySurfaceCookie(supabaseResponse);
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
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

  // ===================== EMPLOYEE ROUTES =====================
  if (isEmployeeRoute) {
    // Blocked explanation page is always reachable (desktop users land here)
    if (isEmployeeBlocked) {
      return clearLegacySurfaceCookie(supabaseResponse);
    }

    // Entire employee portal (login included): mobile only
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

        // Admin session on employee login → sign out so the employee form stays open
        if (isStaff(profile?.role)) {
          await supabase.auth.signOut();
          return clearLegacySurfaceCookie(supabaseResponse);
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

  // ===================== ADMIN AUTH PAGES =====================
  if (isAdminAuth) {
    const isPasswordFlow =
      path.startsWith("/forgot-password") ||
      path.startsWith("/verify-otp") ||
      path.startsWith("/reset-password") ||
      path.startsWith("/auth/");

    if (user && !actionRequest && !isPasswordFlow) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (isStaff(profile?.role) && profile?.is_active && isAdminLogin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }

      // Employee session on admin login → sign out so admin form stays open
      if (profile?.role === "employee" && isAdminLogin) {
        await supabase.auth.signOut();
        return clearLegacySurfaceCookie(supabaseResponse);
      }

      if (profile?.role === "employee" && profile.is_active && !isAdminLogin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/employee";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }

      if (isStaff(profile?.role) && profile?.is_active && !isAdminLogin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }
    }

    return clearLegacySurfaceCookie(supabaseResponse);
  }

  // ===================== ADMIN APP =====================
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
