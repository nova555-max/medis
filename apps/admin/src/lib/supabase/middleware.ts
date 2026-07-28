import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

function isServerAction(request: NextRequest) {
  return (
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.has("Next-Action") ||
      Boolean(
        request.headers.get("content-type")?.includes("multipart/form-data"),
      ) ||
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

/** Clear Supabase auth cookies locally — never await network signOut in middleware. */
function clearAuthCookies(request: NextRequest, res: NextResponse) {
  for (const c of request.cookies.getAll()) {
    const n = c.name;
    if (
      n.includes("auth-token") ||
      n.includes("code-verifier") ||
      (n.startsWith("sb-") && (n.includes("auth") || n.includes("refresh")))
    ) {
      res.cookies.set(n, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      try {
        request.cookies.set(n, "");
      } catch {
        /* ignore */
      }
    }
  }
  return clearLegacySurfaceCookie(res);
}

function isAuthCookieName(name: string) {
  if (name.includes("code-verifier")) return false;
  return (
    name.includes("auth-token") ||
    (name.startsWith("sb-") && name.includes("-auth-token"))
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey: key } = getPublicSupabaseEnv();
  const path = request.nextUrl.pathname;

  // Skip auth entirely for static/API
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

  // Server actions (login/logout forms): never block on getUser/profile/signOut.
  // Cookie writes from the action must pass through quickly.
  if (actionRequest) {
    return clearLegacySurfaceCookie(supabaseResponse);
  }

  const hasSessionCookie = request.cookies.getAll().some((c) => {
    if (!isAuthCookieName(c.name)) return false;
    return Boolean(c.value && c.value.length >= 10);
  });

  if (!hasSessionCookie) {
    if (isEmployeeBlocked) {
      // Legacy page — send users to login instead of a dead-end
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }
    if (isEmployeeRoute) {
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
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
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

  let user: { id: string } | null = null;
  try {
    const timedOut = { data: { user: null }, error: null } as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >;
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<typeof timedOut>((resolve) =>
        setTimeout(() => resolve(timedOut), 8000),
      ),
    ]);
    user = result.data.user ?? null;
  } catch {
    user = null;
  }

  // Stale/corrupt cookie → clear and treat as logged out (prevents hang loops)
  if (!user) {
    const loggedOut = clearAuthCookies(
      request,
      NextResponse.next({ request }),
    );
    if (isEmployeeLogin || isEmployeeForgot || isAdminAuth || isEmployeeBlocked) {
      return loggedOut;
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isEmployeeRoute ? "/employee/login" : "/login";
    redirectUrl.search = "";
    const res = clearAuthCookies(request, NextResponse.redirect(redirectUrl));
    return res;
  }

  // ===================== EMPLOYEE ROUTES =====================
  if (isEmployeeRoute) {
    if (isEmployeeBlocked) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }

    if (isEmployeeLogin || isEmployeeForgot) {
      if (isEmployeeLogin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_active, company_id")
          .eq("id", user.id)
          .maybeSingle();

        if (
          profile?.role === "employee" &&
          profile.is_active &&
          profile.company_id
        ) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/employee";
          return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
        }

        // Wrong role session on employee login → drop cookies, keep form open
        if (isStaff(profile?.role)) {
          return clearAuthCookies(request, supabaseResponse);
        }
      }
      return clearLegacySurfaceCookie(supabaseResponse);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (isStaff(profile?.role) && profile?.is_active && profile.company_id) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
    }

    if (
      !profile ||
      profile.role !== "employee" ||
      !profile.is_active ||
      !profile.company_id
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      redirectUrl.searchParams.set("error", "employee_only");
      return clearAuthCookies(request, NextResponse.redirect(redirectUrl));
    }

    const { data: empStatus } = await supabase
      .from("employees")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!empStatus || empStatus.status !== "active") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      redirectUrl.searchParams.set(
        "error",
        empStatus?.status === "blacklisted" ? "blacklisted" : "inactive",
      );
      return clearAuthCookies(request, NextResponse.redirect(redirectUrl));
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

    if (!isPasswordFlow) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active, company_id")
        .eq("id", user.id)
        .maybeSingle();

      const staffOk =
        isStaff(profile?.role) && profile?.is_active && !!profile?.company_id;
      const employeeOk =
        profile?.role === "employee" &&
        profile.is_active &&
        !!profile.company_id;

      if (staffOk && isAdminLogin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }

      // Employee session on admin login → drop cookies so admin form works
      if (profile?.role === "employee" && isAdminLogin) {
        return clearAuthCookies(request, supabaseResponse);
      }

      if (employeeOk && !isAdminLogin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/employee";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }

      if (staffOk && !isAdminLogin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
      }
    }

    return clearLegacySurfaceCookie(supabaseResponse);
  }

  // ===================== ADMIN APP =====================
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.role === "employee" &&
    profile.is_active &&
    profile.company_id
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/employee";
    return clearLegacySurfaceCookie(NextResponse.redirect(redirectUrl));
  }

  if (
    !profile ||
    !isStaff(profile.role) ||
    !profile.is_active ||
    !profile.company_id
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "admin_only");
    return clearAuthCookies(request, NextResponse.redirect(redirectUrl));
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
