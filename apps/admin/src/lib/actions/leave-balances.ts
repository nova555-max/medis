"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; success?: string };

export async function upsertLeaveBalanceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
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

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." };
  }

  const employeeId = String(formData.get("employeeId") || "").trim();
  const year = Number(formData.get("year") || new Date().getFullYear());
  const seedFromTypes = String(formData.get("seedFromTypes") || "") === "1";

  if (!employeeId) return { error: "زانیاری نادروستە." };

  if (seedFromTypes) {
    const { error } = await supabase.rpc("ensure_leave_balances", {
      p_employee_id: employeeId,
      p_year: year,
    });
    if (error) return { error: "دروستکردنی باڵانس سەرنەکەوت." };
    revalidatePath(`/employees/${employeeId}`);
    revalidatePath("/leave");
    revalidatePath("/employee/leave");
    return { success: "باڵانس لەسەر یاسای جۆرەکانی مۆڵەت دروستکرا." };
  }

  const leaveTypeId = String(formData.get("leaveTypeId") || "").trim();
  const entitled = Number(formData.get("entitledDays") || 0);
  const used = Number(formData.get("usedDays") || 0);

  if (!leaveTypeId) return { error: "زانیاری نادروستە." };
  if (entitled < 0 || used < 0) return { error: "ژمارەکان نابێت نەرێنی بن." };

  const remaining = Math.max(entitled - used, 0);

  const { error } = await supabase.from("leave_balances").upsert(
    {
      company_id: profile.company_id,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      year,
      entitled_days: entitled,
      used_days: used,
      remaining_days: remaining,
    },
    { onConflict: "company_id,employee_id,leave_type_id,year" },
  );

  if (error) return { error: "پاشەکەوتکردنی باڵانس سەرنەکەوت." };

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/leave");
  revalidatePath("/employee/leave");
  return { success: "باڵانسی مۆڵەت پاشەکەوتکرا." };
}
