"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  employeeIdToEmail,
  normalizeDigits,
} from "@/lib/employee-auth-id";

export type EmployeeAuthState = { error?: string; success?: string };

const ENV_ERROR =
  "پەیوەندی سیستەم کێشەی هەیە. تکایە دووبارە هەوڵ بدە یان پەیوەندی بە ئەدمین بکە.";

export async function employeeLoginAction(
  _prev: EmployeeAuthState,
  formData: FormData,
): Promise<EmployeeAuthState> {
  const rawId = normalizeDigits(
    String(formData.get("employeeId") || formData.get("email") || ""),
  )
    .trim()
    .replace(/\s+/g, "");
  const password = String(formData.get("password") || "");
  const deviceId = String(formData.get("deviceId") || "").trim();
  const deviceLabel = String(formData.get("deviceLabel") || "").trim();

  if (!rawId || !password) return { error: "زانیارییەکان نادروستن." };
  if (!deviceId || deviceId.length < 8) {
    const fallback = `srv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return employeeLoginWithDevice(
      rawId,
      password,
      fallback,
      deviceLabel || "مۆبایل",
    );
  }

  return employeeLoginWithDevice(rawId, password, deviceId, deviceLabel);
}

async function employeeLoginWithDevice(
  rawId: string,
  password: string,
  deviceId: string,
  deviceLabel: string,
): Promise<EmployeeAuthState> {
  const email = employeeIdToEmail(rawId);

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: ENV_ERROR };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: "ئایدی یان وشەی نهێنی هەڵەیە." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "چوونەژوورەوە سەرنەکەوت." };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("employee login profile:", profileError.message);
      return { error: "نەتوانرا پرۆفایل بخوێنرێتەوە. دووبارە هەوڵ بدە." };
    }

    if (
      !profile ||
      profile.role !== "employee" ||
      !profile.is_active ||
      !profile.company_id
    ) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      return { error: "ئەم بەشە تەنها بۆ کارمەندانە." };
    }

    const { data: empRow } = await supabase
      .from("employees")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!empRow || empRow.status !== "active") {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      if (empRow?.status === "blacklisted") {
        return { error: "هەژمارەکەت ڕەشکراوە — پەیوەندی بە ئەدمین بکە." };
      }
      return { error: "هەژمارەکەت چالاک نییە." };
    }

    // Device bind/switch must never block login
    try {
      const { error: deviceError } = await supabase.rpc(
        "employee_register_device",
        {
          p_device_id: deviceId,
          p_device_label: deviceLabel || null,
        },
      );
      if (deviceError) {
        console.error("employee_register_device:", deviceError.message);
      }
    } catch (e) {
      console.error("employee_register_device threw:", e);
    }

    return { success: "ok" };
  } catch (e) {
    console.error("employeeLoginWithDevice:", e);
    return { error: "چوونەژوورەوە سەرنەکەوت. دووبارە هەوڵ بدە." };
  }
}

export async function employeeLogoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/employee/login");
}

export async function employeeCheckInAction(input?: {
  lat?: number | null;
  lng?: number | null;
  qrToken?: string | null;
  selfiePath?: string | null;
}): Promise<EmployeeAuthState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("employee_check_in", {
    p_lat: input?.lat ?? null,
    p_lng: input?.lng ?? null,
    p_qr_token: input?.qrToken || null,
    p_device_info: { platform: "web-mobile" },
    p_selfie_path: input?.selfiePath || null,
  });
  if (error) return { error: mapAttendanceError(error.message) };
  revalidatePath("/employee");
  return { success: "چک-ئین سەرکەوتوو بوو" };
}

export async function employeeCheckOutAction(input?: {
  lat?: number | null;
  lng?: number | null;
  selfiePath?: string | null;
}): Promise<EmployeeAuthState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("employee_check_out", {
    p_lat: input?.lat ?? null,
    p_lng: input?.lng ?? null,
    p_device_info: { platform: "web-mobile" },
    p_selfie_path: input?.selfiePath || null,
  });
  if (error) return { error: mapAttendanceError(error.message) };
  revalidatePath("/employee");
  return { success: "چک-ئاوت سەرکەوتوو بوو" };
}

export async function uploadSelfieAction(formData: FormData): Promise<EmployeeAuthState & { path?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.company_id) return { error: "پڕۆفایل نەدۆزرایەوە." };

  const file = formData.get("selfie");
  if (!(file instanceof File) || file.size < 100) {
    return { error: "وێنەی selfie پێویستە." };
  }

  const ext = file.type.includes("png") ? "png" : "jpg";
  const path = `${profile.company_id}/${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("selfies").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) return { error: "بارکردنی وێنە سەرنەکەوت." };
  return { success: "ok", path };
}

export async function employeeLeaveAction(
  _prev: EmployeeAuthState,
  formData: FormData,
): Promise<EmployeeAuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." };

  const { data: emp } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!emp) return { error: "کارمەند نەدۆزرایەوە." };

  const leaveTypeId = String(formData.get("leaveTypeId") || "");
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!leaveTypeId || !startDate || !endDate) {
    return { error: "جۆر و بەروارەکان پێویستن." };
  }

  const days =
    Math.floor(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;
  if (days < 1) return { error: "بەروارەکان نادروستن." };

  const year = new Date(startDate).getFullYear();

  // Seed balances from leave type policy if missing
  await supabase.rpc("ensure_leave_balances", {
    p_employee_id: emp.id,
    p_year: year,
  });

  const { data: available, error: balErr } = await supabase.rpc(
    "leave_available_days",
    {
      p_employee_id: emp.id,
      p_leave_type_id: leaveTypeId,
      p_year: year,
      p_exclude_request_id: null,
    },
  );

  if (!balErr && available != null && Number(available) < days) {
    return {
      error: `باڵانسی مۆڵەت بەس نییە. ماوە: ${Number(available)} ڕۆژ، داواکراو: ${days} ڕۆژ.`,
    };
  }

  const { error } = await supabase.from("leave_requests").insert({
    company_id: emp.company_id,
    employee_id: emp.id,
    leave_type_id: leaveTypeId,
    start_date: startDate,
    end_date: endDate,
    days_count: days,
    reason: reason || null,
    status: "pending",
  });

  if (error) return { error: "ناردنی مۆڵەت سەرنەکەوت." };
  revalidatePath("/employee/leave");
  revalidatePath("/leave");
  return { success: "داواکاری مۆڵەت نێردرا." };
}

function mapAttendanceError(msg: string) {
  if (msg.includes("already checked in")) return "پێشتر چک-ئینت کردووە";
  if (msg.includes("already checked out")) return "پێشتر چک-ئاوتت کردووە";
  if (msg.includes("not checked in")) return "سەرەتا چک-ئین بکە";
  if (msg.includes("gps closed")) return "لە دەرەوەی کاتی دەوام GPS داخراوە";
  if (msg.includes("outside gps radius"))
    return "لە دەرەوەی بازنەی شوێنی کاریت — بۆ هاتن/چوون بچۆ ناو بازنەکە";
  if (msg.includes("gps required")) return "GPS پێویستە — مۆڵەتی شوێن بدە";
  if (msg.includes("live gps not enabled"))
    return "شوێنی ڕاستەوخۆ بۆ ئەم هەژمارە چالاک نییە";
  if (msg.includes("on leave")) return "ئەمڕۆ مۆڵەتت هەیە";
  if (msg.includes("friday off") || msg.includes("weekly off"))
    return "ئەمڕۆ پشووی هەفتانەیە — چک-ئین ناکرێت";
  if (msg.includes("holiday")) return "ئەمڕۆ پشووە — چک-ئین ناکرێت";
  if (msg.includes("qr required")) return "کۆدی QR پێویستە";
  if (msg.includes("invalid qr")) return "کۆدی QR نادروستە یان بەسەرچووە";
  if (msg.includes("selfie required")) return "وێنەی selfie پێویستە";
  if (msg.includes("employee gps location not set"))
    return "شوێنی GPSی کارمەند دیاری نەکراوە — لە ئەدمین بپرسە";
  return "کردارەکە سەرنەکەوت";
}
