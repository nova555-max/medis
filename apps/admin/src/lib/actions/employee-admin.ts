"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAlphanumericPassword } from "@/lib/employee-auth-id";

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
  const employeeCode = String(formData.get("employeeCode") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const hireDate = String(formData.get("hireDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const departmentId = String(formData.get("departmentId") || "").trim();
  const positionId = String(formData.get("positionId") || "").trim();
  const baseSalary = Number(formData.get("baseSalary") || 0);
  const currencyRaw = String(formData.get("currency") || "IQD");
  const currency = currencyRaw === "USD" ? "USD" : "IQD";
  const employeeTypeRaw = String(formData.get("employeeType") || "office").trim();
  const employeeType = employeeTypeRaw === "online" ? "online" : "office";

  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };
  if (!fullName || fullName.length < 2) return { error: "ناو پێویستە." };
  if (!employeeCode) return { error: "کۆدی کارمەند پێویستە." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "ئیمەیڵ نادروستە." };
  }
  if (hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
    return { error: "بەرواری دامەزراندن نادروستە." };
  }
  if (baseSalary < 0) return { error: "مووچە نادروستە." };

  const { data: emp, error: findErr } = await ctx.supabase
    .from("employees")
    .select("id, user_id, employee_code")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (findErr || !emp) return { error: "کارمەند نەدۆزرایەوە." };

  if (employeeCode !== emp.employee_code) {
    const { data: clash } = await ctx.supabase
      .from("employees")
      .select("id")
      .eq("company_id", ctx.profile.company_id)
      .eq("employee_code", employeeCode)
      .neq("id", employeeId)
      .maybeSingle();
    if (clash) return { error: "ئەم کۆدە پێشتر بەکارهاتووە." };
  }

  const updatePayload: Record<string, unknown> = {
    full_name: fullName,
    employee_code: employeeCode,
    phone: phone || null,
    email: email || null,
    hire_date: hireDate || null,
    notes: notes || null,
    department_id: departmentId || null,
    position_id: positionId || null,
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
      .update({
        full_name: fullName,
        phone: phone || null,
        email: email || null,
      })
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

export type PasswordActionResult = ActionResult & { password?: string };

export async function setEmployeePasswordAction(
  _prev: PasswordActionResult,
  formData: FormData,
): Promise<PasswordActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  const customPassword = String(formData.get("password") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id, user_id, full_name, employee_code, status")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (!emp?.user_id) return { error: "هەژماری کارمەند نەدۆزرایەوە." };
  if (emp.status === "blacklisted") {
    return { error: "کارمەندی ڕەشکراو ناتوانرێت وشەی نهێنی بۆ دابنرێت." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  const newPassword =
    customPassword || generateAlphanumericPassword(10);
  if (!/^[A-Za-z0-9]{8,32}$/.test(newPassword)) {
    return { error: "وشەی نهێنی دەبێت ٨–٣٢ پیت/ژمارە بێت." };
  }

  const { error: updErr } = await service.auth.admin.updateUserById(
    emp.user_id,
    { password: newPassword },
  );
  if (updErr) return { error: "دانانی وشەی نهێنی سەرنەکەوت." };

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "employee.password_set",
    entity_type: "employee",
    entity_id: employeeId,
  });

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/password-requests");
  return {
    success: `وشەی نهێنی نوێ بۆ ${emp.full_name || emp.employee_code} دانرا — پێی بڵێ.`,
    password: newPassword,
  };
}

export async function blacklistEmployeeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id, user_id")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (!emp) return { error: "کارمەند نەدۆزرایەوە." };

  const { error } = await ctx.supabase
    .from("employees")
    .update({ status: "blacklisted" })
    .eq("id", employeeId);

  if (error) return { error: "ڕەشکردنەوە سەرنەکەوت." };

  if (emp.user_id) {
    await ctx.supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", emp.user_id);
  }

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "employee.blacklisted",
    entity_type: "employee",
    entity_id: employeeId,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return { success: "کارمەند ڕەشکرایەوە — ناتوانێت بچێتە ژوورەوە." };
}

export async function restoreEmployeeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id, user_id")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (!emp) return { error: "کارمەند نەدۆزرایەوە." };

  const { error } = await ctx.supabase
    .from("employees")
    .update({ status: "active" })
    .eq("id", employeeId);

  if (error) return { error: "گەڕاندنەوە سەرنەکەوت." };

  if (emp.user_id) {
    await ctx.supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", emp.user_id);
  }

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "employee.restored",
    entity_type: "employee",
    entity_id: employeeId,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return { success: "کارمەند گەڕێنرایەوە بۆ دۆخی چالاک." };
}

export async function removeEmployeeFromSystemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  const confirm = String(formData.get("confirm") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };
  if (confirm !== "DELETE") {
    return { error: "بۆ دڵنیابوونەوە DELETE بنووسە." };
  }

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id, user_id, full_name, employee_code")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (!emp) return { error: "کارمەند نەدۆزرایەوە." };

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  const userId = emp.user_id;

  const { error: delEmpErr } = await service
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id);

  if (delEmpErr) {
    return {
      error:
        "سڕینەوە سەرنەکەوت — ئەگەر پێویست بوو یەکەم جار ڕەشی بکە یان ئەرشیفی بکە.",
    };
  }

  if (userId) {
    await service.from("profiles").delete().eq("id", userId);
    await service.auth.admin.deleteUser(userId);
  }

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "employee.removed",
    entity_type: "employee",
    entity_id: employeeId,
    metadata: {
      full_name: emp.full_name,
      employee_code: emp.employee_code,
    },
  });

  revalidatePath("/employees");
  return { success: "کارمەند بە تەواوی لە سیستەم سڕایەوە." };
}
