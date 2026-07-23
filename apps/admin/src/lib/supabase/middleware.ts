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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
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
  const isEmployeeApp =
    path === "/employee" || path.startsWith("/employee/");
  const isEmployeeLogin = path === "/employee/login";
  const isEmployeeBlocked = path === "/employee/desktop-blocked";
  const isAdminAuth =
    path.startsWith("/login") || path.startsWith("/register");
  const actionRequest = isServerAction(request);
  const allowDesktopEmployee =
    process.env.ALLOW_EMPLOYEE_DESKTOP === "1" ||
    request.cookies.get("mo_allow_desktop")?.value === "1";
  const ua = request.headers.get("user-agent") || "";
  const mobileOk = allowDesktopEmployee || isMobileUserAgent(ua);

  if ((isEmployeeApp || isEmployeeLogin) && !isEmployeeBlocked && !mobileOk) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/employee/desktop-blocked";
    return NextResponse.redirect(redirectUrl);
  }

  if (isEmployeeBlocked) {
    return supabaseResponse;
  }

  if (isEmployeeLogin) {
    if (user && !actionRequest) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "employee" && profile.is_active) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/employee";
        return NextResponse.redirect(redirectUrl);
      }
      if (isStaff(profile?.role) && profile?.is_active) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return NextResponse.redirect(redirectUrl);
      }
    }
    return supabaseResponse;
  }

  if (isEmployeeApp) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      return NextResponse.redirect(redirectUrl);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (isStaff(profile?.role) && profile?.is_active) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
    if (!profile || profile.role !== "employee" || !profile.is_active) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/employee/login";
      redirectUrl.searchParams.set("error", "employee_only");
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  if (isAdminAuth) {
    if (user && !actionRequest) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "employee" && profile.is_active) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/employee";
        return NextResponse.redirect(redirectUrl);
      }
      if (isStaff(profile?.role) && profile?.is_active) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return NextResponse.redirect(redirectUrl);
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "employee" && profile.is_active) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/employee";
    return NextResponse.redirect(redirectUrl);
  }

  if (!profile || !isStaff(profile.role) || !profile.is_active) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "admin_only");
    return NextResponse.redirect(redirectUrl);
  }

  if (profile.role === "manager") {
    const blocked =
      path.startsWith("/settings") ||
      path.startsWith("/backups") ||
      path.startsWith("/activity-logs");
    if (blocked) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
