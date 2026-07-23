"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push";

export type ActionResult = {
  error?: string;
  success?: string;
  generated?: number;
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

function revalidatePayroll() {
  revalidatePath("/payroll");
  revalidatePath("/employees");
  revalidatePath("/employee");
  revalidatePath("/employee/salary");
  revalidatePath("/employee/notifications");
}

export async function generateMonthlyPayrollAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const now = new Date();
  const year = Number(formData.get("year") || now.getFullYear());
  const month = Number(formData.get("month") || now.getMonth() + 1);

  if (!year || month < 1 || month > 12) {
    return { error: "مانگ/ساڵ نادروستە." };
  }

  const { data, error } = await ctx.supabase.rpc(
    "admin_generate_monthly_payroll",
    { p_year: year, p_month: month },
  );

  if (error) {
    return { error: "دروستکردنی خۆکاری مووچە سەرنەکەوت." };
  }

  const result = data as {
    generated?: number;
    skipped_paid?: number;
    year?: number;
    month?: number;
  } | null;

  revalidatePayroll();
  return {
    success:
      `مووچەی ${result?.month}/${result?.year} خۆکار دروستکرا: ${result?.generated ?? 0} کارمەند` +
      (result?.skipped_paid
        ? ` (${result.skipped_paid} پارەدراو جێهێڵدرا)`
        : ""),
    generated: result?.generated ?? 0,
  };
}

export async function markSalaryPaidAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const salaryId = String(formData.get("salaryId") || "").trim();
  if (!salaryId) return { error: "مووچە نەدۆزرایەوە." };

  const { data: salary } = await ctx.supabase
    .from("salaries")
    .select(
      "id, employee_id, year, month, base_amount, allowances, deductions, net_amount, status",
    )
    .eq("id", salaryId)
    .maybeSingle();

  if (!salary) return { error: "مووچە نەدۆزرایەوە." };
  if (salary.status === "paid") {
    return { success: "پێشتر وەک پارەدراو تۆمارکراوە." };
  }

  const { error } = await ctx.supabase.rpc("admin_upsert_salary", {
    p_employee_id: salary.employee_id,
    p_year: salary.year,
    p_month: salary.month,
    p_base: salary.base_amount,
    p_allowances: salary.allowances,
    p_deductions: salary.deductions,
    p_status: "paid",
    p_note: null,
  });

  if (error) return { error: "نیشانەکردنی وەک پارەدراو سەرنەکەوت." };

  await ctx.supabase
    .from("salaries")
    .update({
      net_amount: salary.net_amount,
      paid_at: new Date().toISOString(),
      status: "paid",
    })
    .eq("id", salaryId);

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("user_id")
    .eq("id", salary.employee_id)
    .maybeSingle();

  await pushToUser(
    emp?.user_id,
    "مووچە پارەدرا",
    `مووچەی ${salary.month}/${salary.year} وەک پارەدراو نیشانەکرا.`,
    { type: "salary_paid", salaryId },
  );

  revalidatePayroll();
  return { success: "مووچە وەک پارەدراو نیشانەکرا و ئاگاداری نێردرا." };
}

export async function addSalaryAdvanceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const installmentAmount = Number(
    formData.get("installmentAmount") || formData.get("installment") || 0,
  );
  const note = String(formData.get("note") || "").trim() || null;
  const currency = String(formData.get("currency") || "").trim() || null;

  if (!employeeId) return { error: "کارمەند پێویستە." };
  if (!(amount > 0)) return { error: "بڕی پێشەکی نادروستە." };
  if (!(installmentAmount > 0)) return { error: "قیستی مانگانە نادروستە." };

  const { error } = await ctx.supabase.rpc("admin_add_salary_advance", {
    p_employee_id: employeeId,
    p_amount: amount,
    p_installment_amount: installmentAmount,
    p_note: note,
    p_currency: currency,
  });

  if (error) {
    return { error: `تۆماری پێشەکی سەرنەکەوت: ${error.message || ""}` };
  }

  revalidatePayroll();
  return { success: "پێشەکی تۆمارکرا." };
}

export async function cancelSalaryAdvanceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const advanceId = String(formData.get("advanceId") || "").trim();
  if (!advanceId) return { error: "پێشەکی نەدۆزرایەوە." };

  const { error } = await ctx.supabase.rpc("admin_cancel_salary_advance", {
    p_id: advanceId,
  });

  if (error) {
    return { error: `هەڵوەشاندنەوە سەرنەکەوت: ${error.message || ""}` };
  }

  revalidatePayroll();
  return { success: "پێشەکی هەڵوەشێنرایەوە." };
}

export async function addPayrollItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "");
  const title = String(formData.get("title") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const kind = String(formData.get("kind") || "reward");
  const rewardDate = String(formData.get("rewardDate") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const currency = String(formData.get("currency") || "").trim() || null;

  if (!employeeId || !title) return { error: "ناونیشان و کارمەند پێویستن." };
  if (kind !== "reward" && kind !== "fine") return { error: "جۆر نادروستە." };
  if (amount < 0) return { error: "بڕ نابێت نەرێنی بێت." };

  const { error } = await ctx.supabase.rpc("admin_add_payroll_item", {
    p_employee_id: employeeId,
    p_title: title,
    p_amount: amount,
    p_kind: kind,
    p_reward_date: rewardDate || null,
    p_note: note || null,
    p_currency: currency,
  });

  if (error) {
    return {
      error:
        kind === "fine"
          ? "تۆماری غەرامە سەرنەکەوت."
          : "تۆماری پاداشت سەرنەکەوت.",
    };
  }

  revalidatePayroll();
  return {
    success:
      kind === "fine"
        ? "غەرامە تۆمارکرا و خۆکار لە مووچە بڕدرا."
        : "پاداشت تۆمارکرا و خۆکار بۆ مووچە زیادکرا.",
  };
}

export async function deletePayrollItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const itemId = String(formData.get("itemId") || "").trim();
  if (!itemId) return { error: "بڕگە نەدۆزرایەوە." };

  const { error } = await ctx.supabase.rpc("admin_delete_payroll_item", {
    p_item_id: itemId,
  });

  if (error) {
    return { error: `سڕینەوە سەرنەکەوت: ${error.message || ""}` };
  }

  revalidatePayroll();
  return { success: "بڕگە سڕایەوە و مووچە دووبارە ژمێردرایەوە." };
}

export async function upsertSalaryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireStaff();
  if (ctx.error) return { error: ctx.error };

  const employeeId = String(formData.get("employeeId") || "");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const base = Number(formData.get("base") || 0);
  const allowances = Number(formData.get("allowances") || 0);
  const deductions = Number(formData.get("deductions") || 0);
  const overtime = Number(formData.get("overtime") || 0);
  const bonus = Number(formData.get("bonus") || 0);
  const paymentMethod = String(formData.get("paymentMethod") || "cash");
  const currencyRaw = String(formData.get("currency") || "IQD");
  const currency = currencyRaw === "USD" ? "USD" : "IQD";
  const status = String(formData.get("status") || "draft");
  const note = String(formData.get("note") || "").trim();

  if (!employeeId || !year || !month) {
    return { error: "کارمەند و مانگ/ساڵ پێویستن." };
  }

  const { data: salaryId, error } = await ctx.supabase.rpc(
    "admin_upsert_salary",
    {
      p_employee_id: employeeId,
      p_year: year,
      p_month: month,
      p_base: base,
      p_allowances: allowances + bonus,
      p_deductions: deductions,
      p_status: status,
      p_note: note || null,
    },
  );

  if (error) return { error: "پاشەکەوتکردنی مووچە سەرنەکەوت." };

  if (salaryId) {
    const net = base + overtime + bonus + allowances - deductions;
    await ctx.supabase
      .from("salaries")
      .update({
        overtime_amount: overtime,
        bonus_amount: bonus,
        payment_method: paymentMethod,
        currency,
        net_amount: net,
        allowances: allowances + bonus,
      })
      .eq("id", salaryId);
  }

  revalidatePayroll();
  return {
    success:
      status === "paid"
        ? "مووچە تۆمارکرا و ئاگاداری بۆ کارمەند نێردرا."
        : "مووچە پاشەکەوتکرا.",
  };
}

/** @deprecated use addPayrollItemAction */
export async function addRewardAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  formData.set("kind", "reward");
  return addPayrollItemAction(prev, formData);
}
