"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAlphanumericPassword } from "@/lib/employee-auth-id";
import { pushToUser } from "@/lib/push";

export type EmpPwdState = {
  error?: string;
  success?: string;
  password?: string;
};

function normalizeEmployeeCode(raw: string) {
  return raw.trim().replace(/\s+/g, "");
}

function isMissingRelationError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("employee_password_reset_requests") ||
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("pgrst205") ||
    m.includes("42p01")
  );
}

async function notifyAdminsOfPasswordRequest(
  service: ReturnType<typeof createServiceClient>,
  opts: {
    companyId: string;
    employeeId: string;
    employeeCode: string;
    fullName: string;
    requestId?: string | null;
  },
) {
  const { data: admins } = await service
    .from("profiles")
    .select("id")
    .eq("company_id", opts.companyId)
    .eq("role", "admin")
    .eq("is_active", true);

  const title = "داواکاری گۆڕینی وشەی نهێنی کارمەند";
  const body = `${opts.fullName || "کارمەند"} (${opts.employeeCode}) داوای وشەی نهێنی نوێی کرد.`;

  for (const admin of admins ?? []) {
    await service.from("notifications").insert({
      company_id: opts.companyId,
      user_id: admin.id,
      title,
      body,
      type: "employee_password_reset",
      data: {
        employeeId: opts.employeeId,
        employeeCode: opts.employeeCode,
        requestId: opts.requestId || null,
        status: "pending",
      },
      is_read: false,
    });
    await pushToUser(admin.id, title, body, {
      type: "employee_password_reset",
      employeeId: opts.employeeId,
    });
  }

  return (admins ?? []).length;
}

export async function employeeRequestPasswordResetAction(
  _prev: EmpPwdState,
  formData: FormData,
): Promise<EmpPwdState> {
  const rawId = normalizeEmployeeCode(
    String(formData.get("employeeId") || ""),
  );
  if (!rawId) {
    return { error: "ئایدی کارمەند بنووسە." };
  }
  // Accept classic 10-digit IDs and any later custom codes admins may set
  if (rawId.length < 4 || rawId.length > 64) {
    return { error: "ئایدی کارمەند نادروستە." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە — پەیوەندی بە بەڕێوەبەر بکە." };
  }

  const { data: emp } = await service
    .from("employees")
    .select("id, company_id, full_name, employee_code, user_id, status")
    .eq("employee_code", rawId)
    .maybeSingle();

  const okMsg =
    "ئەگەر ئەم ئایدیە تۆمارکراو بێت، داواکاری بۆ ئەدمین نێردرا. دوای گۆڕینی وشەی نهێنی، ئەدمین پێت دەڵێت.";

  if (!emp || emp.status !== "active" || !emp.user_id) {
    return { success: okMsg };
  }

  let requestId: string | null = null;
  let tableMissing = false;

  const { data: existing, error: existingErr } = await service
    .from("employee_password_reset_requests")
    .select("id")
    .eq("employee_id", emp.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingErr && isMissingRelationError(existingErr.message)) {
    tableMissing = true;
  } else if (existing?.id) {
    requestId = existing.id;
  } else if (!existingErr) {
    const { data: inserted, error: insErr } = await service
      .from("employee_password_reset_requests")
      .insert({
        company_id: emp.company_id,
        employee_id: emp.id,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      if (isMissingRelationError(insErr.message)) {
        tableMissing = true;
      } else {
        console.error("emp pwd reset insert:", insErr.message);
        // Still try notifications so admin is not left blind
      }
    } else {
      requestId = inserted?.id || null;
    }
  }

  const adminCount = await notifyAdminsOfPasswordRequest(service, {
    companyId: emp.company_id,
    employeeId: emp.id,
    employeeCode: emp.employee_code,
    fullName: emp.full_name || "کارمەند",
    requestId,
  });

  await service.from("activity_logs").insert({
    company_id: emp.company_id,
    actor_id: emp.user_id,
    action: "employee.password_reset_requested",
    entity_type: "employee",
    entity_id: emp.id,
    metadata: {
      employee_code: emp.employee_code,
      request_id: requestId,
      via_notifications: true,
      table_missing: tableMissing,
      admin_count: adminCount,
    },
  });

  if (adminCount === 0) {
    return {
      error:
        "داواکاری تۆمارکرا بەڵام هیچ ئەدمینێکی چالاک نەدۆزرایەوە. پەیوەندی بە بەڕێوەبەر بکە.",
    };
  }

  revalidatePath("/password-requests");
  revalidatePath("/notifications");
  return { success: okMsg };
}

export async function adminCompleteEmployeePasswordResetAction(
  _prev: EmpPwdState,
  formData: FormData,
): Promise<EmpPwdState> {
  const requestId = String(formData.get("requestId") || "").trim();
  const employeeId = String(formData.get("employeeId") || "").trim();
  const customPassword = String(formData.get("password") || "").trim();

  if (!requestId && !employeeId) {
    return { error: "داواکاری نادروستە." };
  }

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

  if (!profile?.is_active || profile.role !== "admin") {
    return { error: "دەستگەیشتن ڕەتکرایەوە." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  let targetEmployeeId = employeeId;
  let trackedRequestId = requestId || null;

  if (requestId) {
    const { data: req, error: reqErr } = await service
      .from("employee_password_reset_requests")
      .select(
        "id, status, company_id, employee_id, employees(user_id, full_name, employee_code)",
      )
      .eq("id", requestId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (!reqErr && req) {
      if (req.status !== "pending") {
        return { error: "داواکاری نەدۆزرایەوە یان پێشتر چارەسەر کراوە." };
      }
      targetEmployeeId = req.employee_id;
      trackedRequestId = req.id;
    } else if (reqErr && !isMissingRelationError(reqErr.message) && !employeeId) {
      return { error: "داواکاری نەدۆزرایەوە." };
    }
  }

  if (!targetEmployeeId) {
    return { error: "کارمەند نەدۆزرایەوە." };
  }

  const { data: emp } = await service
    .from("employees")
    .select("id, user_id, full_name, employee_code, company_id")
    .eq("id", targetEmployeeId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!emp?.user_id) return { error: "هەژماری کارمەند نەدۆزرایەوە." };

  const newPassword = customPassword || generateAlphanumericPassword(10);
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

  if (trackedRequestId) {
    await service
      .from("employee_password_reset_requests")
      .update({
        status: "completed",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", trackedRequestId)
      .eq("company_id", profile.company_id);
  } else {
    // Complete any pending row for this employee if table exists
    await service
      .from("employee_password_reset_requests")
      .update({
        status: "completed",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("employee_id", emp.id)
      .eq("company_id", profile.company_id)
      .eq("status", "pending");
  }

  // Close related admin notifications (works even when requests table was missing)
  const { data: relatedNotifs } = await service
    .from("notifications")
    .select("id, data")
    .eq("company_id", profile.company_id)
    .eq("type", "employee_password_reset")
    .eq("is_read", false);

  for (const n of relatedNotifs ?? []) {
    const data = (n.data || {}) as Record<string, unknown>;
    if (String(data.employeeId || "") !== emp.id) continue;
    if (data.status && data.status !== "pending") continue;
    await service
      .from("notifications")
      .update({
        is_read: true,
        data: { ...data, status: "completed", resolvedAt: new Date().toISOString() },
      })
      .eq("id", n.id);
  }

  await service.from("notifications").insert({
    company_id: emp.company_id,
    user_id: emp.user_id,
    title: "وشەی نهێنیت نوێکرایەوە",
    body: "ئەدمین وشەی نهێنی نوێی بۆ دانا. تکایە وشەکە لە ئەدمین وەربگرە و بچۆ ژوورەوە.",
    type: "employee_password_reset",
    data: { requestId: trackedRequestId, status: "completed" },
  });

  await pushToUser(
    emp.user_id,
    "وشەی نهێنیت نوێکرایەوە",
    "تکایە وشەکەی نوێ لە ئەدمین وەربگرە.",
    { type: "employee_password_reset" },
  );

  revalidatePath("/password-requests");
  revalidatePath("/notifications");
  revalidatePath(`/employees/${emp.id}`);

  return {
    success: `وشەی نهێنی نوێ بۆ ${emp.full_name || emp.employee_code} دانرا. پێی بڵێ.`,
    password: newPassword,
  };
}
