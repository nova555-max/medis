"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  employeeIdToEmail,
  generateAlphanumericPassword,
  generateDigitCode,
  isAlphanumericPassword,
} from "@/lib/employee-auth-id";

export type ActionResult = {
  error?: string;
  success?: string;
  loginId?: string;
  password?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "تکایە بچۆ ژوورەوە." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { supabase, error: "دەستگەیشتن ڕەتکرایەوە." as const };
  }

  return { supabase, user, profile, error: null };
}

export async function createDepartmentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "ناوی بەش پێویستە." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase.from("departments").insert({
    company_id: ctx.profile.company_id,
    name,
  });

  if (error) {
    return { error: error.code === "23505" ? "ئەم بەشە پێشتر هەیە." : "زیادکردن سەرنەکەوت." };
  }

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "department.created",
    entity_type: "department",
    metadata: { name },
  });

  revalidatePath("/departments");
  return { success: "بەش زیادکرا." };
}

export async function deleteDepartmentAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("departments")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "سڕینەوە سەرنەکەوت." };

  revalidatePath("/departments");
  return { success: "بەش سڕایەوە." };
}

export async function createPositionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "ناوی پۆست پێویستە." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase.from("positions").insert({
    company_id: ctx.profile.company_id,
    name,
  });

  if (error) {
    return { error: error.code === "23505" ? "ئەم پۆستە پێشتر هەیە." : "زیادکردن سەرنەکەوت." };
  }

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "position.created",
    entity_type: "position",
    metadata: { name },
  });

  revalidatePath("/positions");
  return { success: "پۆست زیادکرا." };
}

export async function deletePositionAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("positions")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "سڕینەوە سەرنەکەوت." };

  revalidatePath("/positions");
  return { success: "پۆست سڕایەوە." };
}

export async function createEmployeeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const departmentId = String(formData.get("departmentId") || "").trim();
  const positionId = String(formData.get("positionId") || "").trim();
  const hireDate = String(formData.get("hireDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const gpsEnabled = formData.get("gpsEnabled") === "on";
  const gpsLatRaw = String(formData.get("gpsLat") || "").trim();
  const gpsLngRaw = String(formData.get("gpsLng") || "").trim();
  const gpsRadius = Number(formData.get("gpsRadius") || 150);

  if (!fullName || fullName.length < 2) {
    return { error: "ناوی کارمەند پێویستە." };
  }

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const preferredCode = String(formData.get("loginId") || "").trim();
  const preferredPassword = String(formData.get("loginPassword") || "").trim();
  const employeeTypeRaw = String(formData.get("employeeType") || "office").trim();
  const employeeType = employeeTypeRaw === "online" ? "online" : "office";
  const codeOk = /^\d{10}$/.test(preferredCode);
  const passOk = isAlphanumericPassword(preferredPassword, 10);

  const effectiveGps = employeeType === "online" ? false : gpsEnabled;
  if (effectiveGps && (!gpsLatRaw || !gpsLngRaw)) {
    return { error: "کاتێک GPS چالاکە، شوێن لەسەر نەخشە دیاری بکە." };
  }

  let employeeCode = "";
  let password = "";
  let employeeId: string | null = null;
  let lastError: string | null = null;

  // retry if rare ID collision
  for (let attempt = 0; attempt < 8; attempt++) {
    employeeCode =
      attempt === 0 && codeOk ? preferredCode : generateDigitCode(10);
    password =
      attempt === 0 && passOk
        ? preferredPassword
        : generateAlphanumericPassword(10);
    const email = employeeIdToEmail(employeeCode);

    const { data, error } = await ctx.supabase.rpc("admin_create_employee", {
      p_full_name: fullName,
      p_employee_code: employeeCode,
      p_email: email,
      p_password: password,
      p_phone: phone || null,
      p_department_id: departmentId || null,
      p_position_id: positionId || null,
      p_hire_date: hireDate || null,
      p_notes: notes || null,
      p_gps_enabled: effectiveGps,
      p_gps_lat: effectiveGps && gpsLatRaw ? Number(gpsLatRaw) : null,
      p_gps_lng: effectiveGps && gpsLngRaw ? Number(gpsLngRaw) : null,
      p_gps_radius_meters: gpsRadius || 150,
      p_employee_type: employeeType,
    });

    if (!error && data) {
      employeeId = data as string;
      lastError = null;
      break;
    }

    const msg = error?.message || "";
    if (msg.includes("employee code exists") || msg.includes("email already exists")) {
      lastError = msg;
      continue;
    }
    if (msg.includes("gps location required")) {
      return { error: "کاتێک GPS چالاکە، شوێن لەسەر نەخشە دیاری بکە." };
    }
    if (msg.includes("not authorized")) {
      return { error: "دەستگەیشتن ڕەتکرایەوە." };
    }
    if (msg.includes("password too short")) {
      return { error: "وشەی نهێنی کورتە." };
    }
    return {
      error: msg
        ? `زیادکردنی کارمەند سەرنەکەوت: ${msg}`
        : "زیادکردنی کارمەند سەرنەکەوت.",
    };
  }

  if (!employeeId) {
    return {
      error: lastError?.includes("exists")
        ? "دروستکردنی ئایدی سەرنەکەوت — دووبارە هەوڵ بدە."
        : "زیادکردنی کارمەند سەرنەکەوت.",
    };
  }

  const baseSalary = Number(formData.get("baseSalary") || 0);
  const currencyRaw = String(formData.get("currency") || "IQD");
  const currency = currencyRaw === "USD" ? "USD" : "IQD";
  if (baseSalary >= 0) {
    await ctx.supabase
      .from("employees")
      .update({ base_salary: baseSalary, currency })
      .eq("id", employeeId)
      .eq("company_id", ctx.profile.company_id);
    if (baseSalary > 0) {
      await ctx.supabase.rpc("admin_sync_employee_salary_after_base_change", {
        p_employee_id: employeeId,
      });
    }
  }

  revalidatePath("/employees");
  revalidatePath("/payroll");
  return {
    success: "کارمەند زیادکرا. ئایدی و وشەی نهێنی خۆکار دروستکران — پێیان بدە.",
    loginId: employeeCode,
    password,
  };
}

export async function updateEmployeeGpsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("employeeId") || "").trim();
  const gpsEnabled = formData.get("gpsEnabled") === "on";
  const gpsLatRaw = String(formData.get("gpsLat") || "").trim();
  const gpsLngRaw = String(formData.get("gpsLng") || "").trim();
  const gpsRadius = Number(formData.get("gpsRadius") || 150);

  if (!id) return { error: "کارمەند نەدۆزرایەوە." };
  if (gpsEnabled && (!gpsLatRaw || !gpsLngRaw)) {
    return { error: "کاتێک GPS چالاکە، شوێن لەسەر نەخشە دیاری بکە." };
  }

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id, employee_type")
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();

  if (!emp) return { error: "کارمەند نەدۆزرایەوە." };
  if ((emp as { employee_type?: string }).employee_type === "online") {
    return {
      error: "کارمەندی ئۆنلاین ناتوانێت GPSی ئۆفیس چالاک بکات.",
    };
  }

  const { error } = await ctx.supabase
    .from("employees")
    .update({
      gps_enabled: gpsEnabled,
      gps_lat: gpsEnabled && gpsLatRaw ? Number(gpsLatRaw) : null,
      gps_lng: gpsEnabled && gpsLngRaw ? Number(gpsLngRaw) : null,
      gps_radius_meters: gpsRadius || 150,
    })
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "پاشەکەوتکردنی GPS سەرنەکەوت." };

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "employee.gps_updated",
    entity_type: "employee",
    entity_id: id,
    metadata: { gpsEnabled },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: "ڕێکخستنی GPS پاشەکەوتکرا." };
}

export async function archiveEmployeeAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("employees")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "ئەرشیفکردن سەرنەکەوت." };

  await ctx.supabase.from("activity_logs").insert({
    company_id: ctx.profile.company_id,
    actor_id: ctx.user!.id,
    action: "employee.archived",
    entity_type: "employee",
    entity_id: id,
  });

  revalidatePath("/employees");
  return { success: "کارمەند ئەرشیفکرا." };
}
