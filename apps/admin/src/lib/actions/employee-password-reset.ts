"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAlphanumericPassword } from "@/lib/employee-auth-id";
import { pushToUser } from "@/lib/push";

export type EmpPwdState = { error?: string; success?: string; password?: string };

export async function employeeRequestPasswordResetAction(
  _prev: EmpPwdState,
  formData: FormData,
): Promise<EmpPwdState> {
  const rawId = String(formData.get("employeeId") || "").trim();
  if (!/^\d{10}$/.test(rawId)) {
    return { error: "ئایدی کارمەند دەبێت ١٠ ژمارە بێت." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  const { data: emp } = await service
    .from("employees")
    .select("id, company_id, full_name, employee_code, user_id, status")
    .eq("employee_code", rawId)
    .maybeSingle();

  // Anti-enumeration: same message whether found or not
  const okMsg =
    "ئەگەر ئەم ئایدیە تۆمارکراو بێت، داواکاری بۆ ئەدمین نێردرا. دوای گۆڕینی وشەی نهێنی، ئەدمین پێت دەڵێت.";

  if (!emp || emp.status !== "active" || !emp.user_id) {
    return { success: okMsg };
  }

  const { data: existing } = await service
    .from("employee_password_reset_requests")
    .select("id")
    .eq("employee_id", emp.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await service
      .from("employee_password_reset_requests")
      .insert({
        company_id: emp.company_id,
        employee_id: emp.id,
        status: "pending",
      });
    if (insErr) {
      console.error("emp pwd reset insert:", insErr.message);
      return { error: "ناردنی داواکاری سەرنەکەوت. دووبارە هەوڵ بدەوە." };
    }
  }

  const { data: admins } = await service
    .from("profiles")
    .select("id")
    .eq("company_id", emp.company_id)
    .eq("role", "admin")
    .eq("is_active", true);

  const title = "داواکاری گۆڕینی وشەی نهێنی کارمەند";
  const body = `${emp.full_name || "کارمەند"} (${emp.employee_code}) داوای وشەی نهێنی نوێی کرد.`;

  for (const admin of admins ?? []) {
    await service.from("notifications").insert({
      company_id: emp.company_id,
      user_id: admin.id,
      title,
      body,
      type: "employee_password_reset",
      data: {
        employeeId: emp.id,
        employeeCode: emp.employee_code,
      },
    });
    await pushToUser(admin.id, title, body, {
      type: "employee_password_reset",
      employeeId: emp.id,
    });
  }

  return { success: okMsg };
}

export async function adminCompleteEmployeePasswordResetAction(
  _prev: EmpPwdState,
  formData: FormData,
): Promise<EmpPwdState> {
  const requestId = String(formData.get("requestId") || "").trim();
  const customPassword = String(formData.get("password") || "").trim();
  if (!requestId) return { error: "داواکاری نادروستە." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile?.is_active ||
    (profile.role !== "admin" && profile.role !== "manager")
  ) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  const { data: req } = await service
    .from("employee_password_reset_requests")
    .select(
      "id, status, company_id, employee_id, employees(user_id, full_name, employee_code)",
    )
    .eq("id", requestId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!req || req.status !== "pending") {
    return { error: "داواکاری نەدۆزرایەوە یان پێشتر چارەسەر کراوە." };
  }

  const emp = req.employees as {
    user_id?: string;
    full_name?: string;
    employee_code?: string;
  } | null;
  if (!emp?.user_id) return { error: "هەژماری کارمەند نەدۆزرایەوە." };

  const newPassword =
    customPassword || generateAlphanumericPassword(10);
  if (!/^[A-Za-z0-9]{8,32}$/.test(newPassword)) {
    return { error: "وشەی نهێنی دەبێت ٨–٣٢ پیت/ژمارە بێت." };
  }

  const { error: updErr } = await service.auth.admin.updateUserById(
    emp.user_id,
    { password: newPassword },
  );
  if (updErr) {
    return { error: "گۆڕینی وشەی نهێنی سەرنەکەوت." };
  }

  await service
    .from("employee_password_reset_requests")
    .update({
      status: "completed",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", requestId);

  await service.from("notifications").insert({
    company_id: req.company_id,
    user_id: emp.user_id,
    title: "وشەی نهێنیت نوێکرایەوە",
    body: "ئەدمین وشەی نهێنی نوێی بۆ دانا. تکایە وشەکە لە ئەدمین وەربگرە و بچۆ ژوورەوە.",
    type: "employee_password_reset",
    data: { requestId },
  });

  await pushToUser(
    emp.user_id,
    "وشەی نهێنیت نوێکرایەوە",
    "تکایە وشەکەی نوێ لە ئەدمین وەربگرە.",
    { type: "employee_password_reset" },
  );

  revalidatePath("/password-requests");
  revalidatePath("/notifications");
  revalidatePath(`/employees/${req.employee_id}`);

  return {
    success: `وشەی نهێنی نوێ بۆ ${emp.full_name || emp.employee_code} دانرا. پێی بڵێ.`,
    password: newPassword,
  };
}
