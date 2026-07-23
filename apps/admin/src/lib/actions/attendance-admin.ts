"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AttendanceAdminResult = {
  error?: string;
  success?: string;
};

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." as const, supabase };
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (
    !profile ||
    !profile.is_active ||
    (profile.role !== "admin" && profile.role !== "manager")
  ) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." as const, supabase };
  }
  return { supabase, user, profile, error: null };
}

/** Convert Asia/Baghdad local date + HH:MM to ISO timestamptz */
function baghdadToIso(date: string, time: string | null) {
  if (!time || !time.trim()) return null;
  const t = time.trim();
  // Store as offset +03:00 (Baghdad, no DST)
  return new Date(`${date}T${t.length === 5 ? t + ":00" : t}+03:00`).toISOString();
}

export async function markAbsencesAction(
  _prev: AttendanceAdminResult,
  formData: FormData,
): Promise<AttendanceAdminResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const date = String(formData.get("date") || "").trim() || null;
  const { data, error } = await ctx.supabase.rpc("admin_mark_daily_absences", {
    p_date: date,
  });

  if (error) {
    return { error: "دانانی غائیب سەرنەکەوت: " + error.message };
  }

  const result = data as { marked_absent?: number; skipped?: number; date?: string } | null;
  revalidatePath("/attendance");
  return {
    success: `غائیب تۆمارکرا بۆ ${result?.date}: ${result?.marked_absent ?? 0} کەس (${result?.skipped ?? 0} جێهێڵدرا)`,
  };
}

export async function upsertAttendanceAction(
  _prev: AttendanceAdminResult,
  formData: FormData,
): Promise<AttendanceAdminResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  const workDate = String(formData.get("workDate") || "").trim();
  const checkIn = String(formData.get("checkIn") || "").trim();
  const checkOut = String(formData.get("checkOut") || "").trim();
  const status = String(formData.get("status") || "present").trim();
  const lateMinutes = Number(formData.get("lateMinutes") || 0);
  const note = String(formData.get("note") || "").trim() || null;

  if (!employeeId || !workDate) {
    return { error: "کارمەند و بەروار پێویستن." };
  }

  const { error } = await ctx.supabase.rpc("admin_upsert_attendance", {
    p_employee_id: employeeId,
    p_work_date: workDate,
    p_check_in_at: baghdadToIso(workDate, checkIn || null),
    p_check_out_at: baghdadToIso(workDate, checkOut || null),
    p_status: status,
    p_late_minutes: Number.isFinite(lateMinutes) ? Math.max(0, Math.floor(lateMinutes)) : 0,
    p_note: note,
  });

  if (error) {
    return { error: "پاشەکەوتکردنی دەوام سەرنەکەوت: " + error.message };
  }

  revalidatePath("/attendance");
  return { success: "دەوام پاشەکەوتکرا." };
}
