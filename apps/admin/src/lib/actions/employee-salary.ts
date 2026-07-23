"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; success?: string };

export async function updateEmployeeSalaryAction(
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
  const baseSalary = Number(formData.get("baseSalary") || 0);
  const currency = String(formData.get("currency") || "IQD");
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };
  if (baseSalary < 0) return { error: "مووچە نابێت نەرێنی بێت." };
  if (currency !== "IQD" && currency !== "USD") {
    return { error: "دراو نادروستە." };
  }

  const { error } = await supabase
    .from("employees")
    .update({ base_salary: baseSalary, currency })
    .eq("id", employeeId)
    .eq("company_id", profile.company_id);

  if (error) return { error: "پاشەکەوتکردنی مووچە سەرنەکەوت." };

  // sync current month salary automatically from base + rewards − fines
  await supabase.rpc("admin_sync_employee_salary_after_base_change", {
    p_employee_id: employeeId,
  });

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/payroll");
  revalidatePath("/employee");
  revalidatePath("/employee/salary");
  return { success: "مووچەی کارمەند پاشەکەوتکرا و مووچەی مانگ خۆکار نوێکرایەوە." };
}
