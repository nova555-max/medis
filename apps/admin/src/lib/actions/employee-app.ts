"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { employeeIdToEmail } from "@/lib/employee-auth-id";

export type EmployeeAuthState = { error?: string; success?: string };

export async function employeeLoginAction(
  _prev: EmployeeAuthState,
  formData: FormData,
): Promise<EmployeeAuthState> {
  const rawId = String(
    formData.get("employeeId") || formData.get("email") || "",
  ).trim();
  const password = String(formData.get("password") || "");
  const deviceId = String(formData.get("deviceId") || "").trim();
  const deviceLabel = String(formData.get("deviceLabel") || "").trim();

  if (!rawId || !password) return { error: "زانیارییەکان نادروستن." };
  if (!deviceId || deviceId.length < 8) {
    return { error: "ناسنامەی مۆبایل نەدۆزرایەوە — پەڕەکە نوێ بکەوە." };
  }

  const email = employeeIdToEmail(rawId);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "ئایدی یان وشەی نهێنی هەڵەیە." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "چوونەژوورەوە سەرنەکەوت." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "employee" || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "ئەم بەشە تەنها بۆ کارمەندانە." };
  }

  const { data: deviceResult, error: deviceError } = await supabase.rpc(
    "employee_register_device",
    {
      p_device_id: deviceId,
      p_device_label: deviceLabel || null,
    },
  );

  if (deviceError) {
    await supabase.auth.signOut();
    return { error: "پشکنینی مۆبایل سەرنەکەوت." };
  }

  const result = deviceResult as {
    ok?: boolean;
    status?: string;
  } | null;

  if (!result?.ok) {
    await supabase.auth.signOut();
    return {
      error:
        "ئەم مۆبایلە تۆمار نەکراوە. داواکاری بۆ ئەدمین نێردرا — دوای پەسەندکردن دەتوانیت بچیتە ژوورەوە.",
    };
  }

  return { success: "ok" };
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
