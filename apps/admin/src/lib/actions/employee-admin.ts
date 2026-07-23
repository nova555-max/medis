"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  error?: string;
  success?: string;
};

async function requireAdmin() {
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
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." as const, supabase };
  }
  return { supabase, user, profile, error: null };
}

export async function updateEmployeeProfileAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const departmentId = String(formData.get("departmentId") || "").trim();
  const baseSalary = Number(formData.get("baseSalary") || 0);
  const currencyRaw = String(formData.get("currency") || "IQD");
  const currency = currencyRaw === "USD" ? "USD" : "IQD";
  const employeeTypeRaw = String(formData.get("employeeType") || "office").trim();
  const employeeType = employeeTypeRaw === "online" ? "online" : "office";

  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };
  if (!fullName || fullName.length < 2) return { error: "ناو پێویستە." };
  if (baseSalary < 0) return { error: "مووچە نادروستە." };

  const { data: emp, error: findErr } = await ctx.supabase
    .from("employees")
    .select("id, user_id")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (findErr || !emp) return { error: "کارمەند نەدۆزرایەوە." };

  const updatePayload: Record<string, unknown> = {
    full_name: fullName,
    phone: phone || null,
    department_id: departmentId || null,
    base_salary: baseSalary,
    currency,
    employee_type: employeeType,
  };
  if (employeeType === "online") {
    updatePayload.gps_enabled = false;
    updatePayload.gps_lat = null;
    updatePayload.gps_lng = null;
  }

  const { error } = await ctx.supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", employeeId);

  if (error) return { error: "نوێکردنەوە سەرنەکەوت." };

  if (emp.user_id) {
    await ctx.supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", emp.user_id);
  }

  if (baseSalary > 0) {
    await ctx.supabase.rpc("admin_sync_employee_salary_after_base_change", {
      p_employee_id: employeeId,
    });
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/payroll");
  return { success: "زانیاری کارمەند نوێکرایەوە." };
}

export async function approveEmployeeDeviceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };

  const { error } = await ctx.supabase.rpc("admin_approve_employee_device", {
    p_employee_id: employeeId,
  });
  if (error) return { error: "پەسەندکردنی مۆبایل سەرنەکەوت." };

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/notifications");
  return { success: "مۆبایلی نوێ پەسەندکرا." };
}

export async function clearEmployeeDeviceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };

  const { error } = await ctx.supabase.rpc("admin_clear_employee_device", {
    p_employee_id: employeeId,
  });
  if (error) return { error: "سڕینەوەی مۆبایل سەرنەکەوت." };

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return {
    success:
      "بەستنی مۆبایل لابرا — کارمەند دەتوانێت لە مۆبایلی نوێوە بچێتە ژوورەوە.",
  };
}
