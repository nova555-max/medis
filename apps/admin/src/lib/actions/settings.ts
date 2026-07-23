"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: string };

export async function updateCompanySettingsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { error: "دەستگەیشتن ڕەتکرایەوە." };
  }

  const companyName = String(formData.get("name") || "").trim();
  if (!companyName) return { error: "ناوی کۆمپانیا پێویستە." };

  const loginEmail = String(formData.get("loginEmail") || "")
    .trim()
    .toLowerCase();
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!loginEmail || !loginEmail.includes("@")) {
    return { error: "ئیمەیڵی داخڵبوون نادروستە." };
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: "وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت." };
    }
    if (newPassword !== confirmPassword) {
      return { error: "دووبارەکردنەوەی وشەی نهێنی یەک ناگرێتەوە." };
    }
  }

  let logoUrl = String(formData.get("logoUrl") || "").trim() || null;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 5_000_000) {
      return { error: "لۆگۆ زۆر گەورەیە. تکایە وێنەیەکی بچووکتر هەڵبژێرە." };
    }
    const ext = logoFile.type.includes("png")
      ? "png"
      : logoFile.type.includes("webp")
        ? "webp"
        : "jpg";
    const path = `${profile.company_id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, logoFile, {
        contentType: logoFile.type || "image/png",
        upsert: true,
      });
    if (upErr) {
      return {
        error: `بارکردنی لۆگۆ سەرنەکەوت: ${upErr.message || "هەڵەی نەناسراو"}`,
      };
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    logoUrl = pub.publicUrl;
  }

  const lateFineEnabled = formData.get("lateFineEnabled") === "on";
  const lateFineAmount = Number(formData.get("lateFineAmount") || 0);
  const lateFineAfter = Number(formData.get("lateFineAfterMinutes") || 15);

  const weeklyOffRaw = formData.getAll("weeklyOffDows").map((v) => Number(v));
  const weeklyOffDows = weeklyOffRaw.filter(
    (n) => Number.isInteger(n) && n >= 0 && n <= 6,
  );

  const overtimeRate = Number(formData.get("overtimeRatePerHour") || 0);
  const absenceFineEnabled = formData.get("absenceFineEnabled") === "on";
  const absenceFineAmount = Number(formData.get("absenceFineAmount") || 0);
  const absenceFineModeRaw = String(formData.get("absenceFineMode") || "fixed");
  const absenceFineMode =
    absenceFineModeRaw === "daily_wage" ? "daily_wage" : "fixed";

  const parseCurrency = (raw: FormDataEntryValue | null) =>
    String(raw || "IQD") === "USD" ? "USD" : "IQD";

  // Prefer explicit money currency; fall back across the three selects
  const moneyCurrency = parseCurrency(
    formData.get("moneyCurrency") ||
      formData.get("lateFineCurrency") ||
      formData.get("absenceFineCurrency") ||
      formData.get("overtimeCurrency"),
  );

  const { error: companyErr } = await supabase
    .from("companies")
    .update({
      name: companyName,
      logo_url: logoUrl,
      late_fine_enabled: lateFineEnabled,
      late_fine_amount: Number.isFinite(lateFineAmount)
        ? Math.max(0, lateFineAmount)
        : 0,
      late_fine_after_minutes: Number.isFinite(lateFineAfter)
        ? Math.max(0, Math.floor(lateFineAfter))
        : 15,
      qr_required: formData.get("qrRequired") === "on",
      selfie_required: formData.get("selfieRequired") === "on",
      weekly_off_dows: weeklyOffDows.length > 0 ? weeklyOffDows : [5],
      overtime_rate_per_hour: Number.isFinite(overtimeRate)
        ? Math.max(0, overtimeRate)
        : 0,
      absence_fine_enabled: absenceFineEnabled,
      absence_fine_amount: Number.isFinite(absenceFineAmount)
        ? Math.max(0, absenceFineAmount)
        : 0,
      absence_fine_mode: absenceFineMode,
      default_currency: moneyCurrency,
    })
    .eq("id", profile.company_id);

  if (companyErr) return { error: "پاشەکەوتکردنی کۆمپانیا سەرنەکەوت." };

  const authUpdate: { email?: string; password?: string } = {};
  const currentEmail = (user.email || profile.email || "").toLowerCase();
  if (loginEmail !== currentEmail) {
    authUpdate.email = loginEmail;
  }
  if (newPassword) {
    authUpdate.password = newPassword;
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error: authErr } = await supabase.auth.updateUser(authUpdate);
    if (authErr) {
      return {
        error: `نوێکردنەوەی هەژمار سەرنەکەوت: ${authErr.message}`,
      };
    }
    await supabase
      .from("profiles")
      .update({ email: loginEmail })
      .eq("id", user.id);
  }

  await supabase.from("activity_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    action: "company.settings_updated",
    entity_type: "company",
    entity_id: profile.company_id,
  });

  revalidatePath("/settings");
  revalidatePath("/reports");
  revalidatePath("/employees");
  return { success: "ڕێکخستنەکان پاشەکەوتکران." };
}

export async function updateWorkHoursAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { error: "دەستگەیشتن ڕەتکرایەوە." };
  }

  const workStart = String(formData.get("workStart") || "09:00").trim();
  const workEnd = String(formData.get("workEnd") || "17:00").trim();
  const lateGrace = Number(formData.get("lateGrace") || 15);

  const { error } = await supabase
    .from("companies")
    .update({
      work_start_time: workStart,
      work_end_time: workEnd,
      late_grace_minutes: Number.isFinite(lateGrace) ? lateGrace : 15,
      gps_only_during_work_hours:
        formData.get("gpsOnlyDuringWorkHours") === "on",
    })
    .eq("id", profile.company_id);

  if (error) return { error: "پاشەکەوتکردنی کاتی دەوام سەرنەکەوت." };

  revalidatePath("/employees");
  revalidatePath("/settings");
  return { success: "کاتی هاتن و چوون پاشەکەوتکرا." };
}
