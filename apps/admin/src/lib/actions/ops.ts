"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push";

export type ActionResult = { error?: string; success?: string };

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

  if (
    !profile ||
    !profile.is_active ||
    (profile.role !== "admin" && profile.role !== "manager")
  ) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." as const, supabase };
  }

  return { supabase, user, profile, error: null };
}

async function requireOwner() {
  const ctx = await requireAdmin();
  if (ctx.error) return ctx;
  if (ctx.profile?.role !== "admin") {
    return { error: "دەستگەیشتن ڕەتکرایەوە." as const, supabase: ctx.supabase };
  }
  return ctx;
}

export async function reviewLeaveAction(
  id: string,
  status: "approved" | "rejected",
  note?: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error) return { error: ctx.error };

  const { data: leave } = await ctx.supabase
    .from("leave_requests")
    .select("id, employee_id, employees(user_id)")
    .eq("id", id)
    .maybeSingle();

  const { error } = await ctx.supabase.rpc("admin_review_leave", {
    p_leave_id: id,
    p_status: status,
    p_note: note || null,
  });

  if (error) return { error: "پێداچوونەوە سەرنەکەوت." };

  const emp = leave?.employees as { user_id?: string } | null;
  await pushToUser(
    emp?.user_id,
    status === "approved" ? "مۆڵەت پەسەندکرا" : "مۆڵەت ڕەتکرایەوە",
    status === "approved"
      ? "داواکاری مۆڵەتەکەت پەسەندکرا."
      : "داواکاری مۆڵەتەکەت ڕەتکرایەوە.",
    { type: "leave_review", leaveId: id, status },
  );

  revalidatePath("/leave");
  revalidatePath("/notifications");
  return {
    success: status === "approved" ? "مۆڵەت پەسەندکرا." : "مۆڵەت ڕەتکرایەوە.",
  };
}

export async function createQrTokenAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult & { token?: string }> {
  const ctx = await requireAdmin();
  if (ctx.error) return { error: ctx.error };

  const label = String(formData.get("label") || "سەرەکی").trim();
  const hours = Number(formData.get("hours") || 24);

  const { data, error } = await ctx.supabase.rpc("admin_create_qr_token", {
    p_label: label,
    p_hours: hours,
  });

  if (error) {
    return {
      error: `دروستکردنی QR سەرنەکەوت: ${error.message || "هەڵەی نەناسراو"}`,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token) {
    return { error: "دروستکردنی QR سەرنەکەوت — هیچ کۆدێک نەگەڕایەوە." };
  }

  // Do not revalidate immediately — it remounts the form and can drop the token UI.
  return {
    success: "کۆدی QR دروستکرا.",
    token: String(row.token),
  };
}

export async function sendAnnouncementAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return { error: "ناونیشان و ناوەڕۆک پێویستن." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error: annError } = await ctx.supabase.from("announcements").insert({
    company_id: ctx.profile.company_id,
    title,
    body,
    created_by: ctx.user!.id,
  });
  if (annError) return { error: "ناردن سەرنەکەوت." };

  const { data: employees } = await ctx.supabase
    .from("employees")
    .select("user_id")
    .eq("company_id", ctx.profile.company_id)
    .eq("status", "active")
    .not("user_id", "is", null);

  if (employees?.length) {
    await ctx.supabase.from("notifications").insert(
      employees
        .filter((e) => e.user_id)
        .map((e) => ({
          company_id: ctx.profile!.company_id,
          user_id: e.user_id!,
          title,
          body,
          type: "announcement",
          data: {},
        })),
    );

    await Promise.all(
      employees
        .filter((e) => e.user_id)
        .map((e) =>
          pushToUser(e.user_id!, title, body, { type: "announcement" }),
        ),
    );
  }

  revalidatePath("/notifications");
  return { success: "ئاگاداری نێردرا بۆ کارمەندان." };
}

export async function createBackupAction(): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const companyId = ctx.profile.company_id;

  const [
    { data: employees },
    { data: attendance },
    { data: leave },
    { data: departments },
    { data: positions },
  ] = await Promise.all([
    ctx.supabase.from("employees").select("*").eq("company_id", companyId),
    ctx.supabase.from("attendance_records").select("*").eq("company_id", companyId),
    ctx.supabase.from("leave_requests").select("*").eq("company_id", companyId),
    ctx.supabase.from("departments").select("*").eq("company_id", companyId),
    ctx.supabase.from("positions").select("*").eq("company_id", companyId),
  ]);

  const snapshot = {
    exported_at: new Date().toISOString(),
    company_id: companyId,
    employees: employees ?? [],
    attendance_records: attendance ?? [],
    leave_requests: leave ?? [],
    departments: departments ?? [],
    positions: positions ?? [],
  };

  const json = JSON.stringify(snapshot);
  const path = `${companyId}/backup-${Date.now()}.json`;
  const sizeBytes = new TextEncoder().encode(json).length;

  const { error: uploadError } = await ctx.supabase.storage
    .from("backups")
    .upload(path, new Blob([json], { type: "application/json" }), {
      contentType: "application/json",
      upsert: false,
    });

  const { error } = await ctx.supabase.from("backups").insert({
    company_id: companyId,
    storage_path: uploadError ? null : path,
    size_bytes: sizeBytes,
    status: uploadError ? "failed" : "completed",
    triggered_by: "manual",
    created_by: ctx.user!.id,
    completed_at: new Date().toISOString(),
    error_message: uploadError?.message ?? null,
  });

  if (error || uploadError) {
    return {
      error:
        uploadError?.message ||
        "پاشەکەوت سەرنەکەوت. دڵنیابە bucketی backups هەیە.",
    };
  }

  revalidatePath("/backups");
  return { success: "پاشەکەوت دروستکرا." };
}

type BackupSnapshot = {
  company_id?: string;
  departments?: Record<string, unknown>[];
  positions?: Record<string, unknown>[];
  attendance_records?: Record<string, unknown>[];
  leave_requests?: Record<string, unknown>[];
};

export async function restoreBackupAction(backupId: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const companyId = ctx.profile.company_id;

  const { data: backup } = await ctx.supabase
    .from("backups")
    .select("id, storage_path, status")
    .eq("id", backupId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!backup?.storage_path || backup.status !== "completed") {
    return { error: "پاشەکەوت بۆ گەڕاندنەوە ئامادە نییە." };
  }

  const { data: file, error: dlError } = await ctx.supabase.storage
    .from("backups")
    .download(backup.storage_path);

  if (dlError || !file) return { error: "داگرتنی پاشەکەوت سەرنەکەوت." };

  let snapshot: BackupSnapshot;
  try {
    snapshot = JSON.parse(await file.text()) as BackupSnapshot;
  } catch {
    return { error: "فایلی پاشەکەوت خراپە." };
  }

  if (snapshot.company_id && snapshot.company_id !== companyId) {
    return { error: "ئەم پاشەکەوتە هی کۆمپانیایەکی ترە." };
  }

  const departments = (snapshot.departments ?? []).filter(
    (d) => d.company_id === companyId,
  );
  const positions = (snapshot.positions ?? []).filter(
    (p) => p.company_id === companyId,
  );
  const attendance = (snapshot.attendance_records ?? []).filter(
    (a) => a.company_id === companyId,
  );
  const leave = (snapshot.leave_requests ?? []).filter(
    (l) => l.company_id === companyId,
  );

  if (departments.length) {
    const { error } = await ctx.supabase.from("departments").upsert(departments);
    if (error) return { error: "گەڕاندنەوەی بەشەکان سەرنەکەوت." };
  }
  if (positions.length) {
    const { error } = await ctx.supabase.from("positions").upsert(positions);
    if (error) return { error: "گەڕاندنەوەی پۆستەکان سەرنەکەوت." };
  }
  if (attendance.length) {
    const { error } = await ctx.supabase
      .from("attendance_records")
      .upsert(attendance);
    if (error) return { error: "گەڕاندنەوەی ئامادەبوون سەرنەکەوت." };
  }
  if (leave.length) {
    const { error } = await ctx.supabase.from("leave_requests").upsert(leave);
    if (error) return { error: "گەڕاندنەوەی مۆڵەت سەرنەکەوت." };
  }

  await ctx.supabase.from("activity_logs").insert({
    company_id: companyId,
    actor_id: ctx.user!.id,
    action: "backup.restored",
    entity_type: "backup",
    entity_id: backupId,
    metadata: {
      departments: departments.length,
      positions: positions.length,
      attendance: attendance.length,
      leave: leave.length,
    },
  });

  revalidatePath("/backups");
  revalidatePath("/departments");
  revalidatePath("/positions");
  revalidatePath("/attendance");
  revalidatePath("/leave");
  return { success: "پاشەکەوت گەڕێندرایەوە (بەش، پۆست، ئامادەبوون، مۆڵەت)." };
}
