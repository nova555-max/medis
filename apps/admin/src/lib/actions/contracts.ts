"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ContractDesignId,
  ContractScoreLine,
} from "@/components/contracts/contract-types";

export type ActionResult = {
  error?: string;
  success?: string;
  id?: string;
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

  if (
    !profile?.is_active ||
    (profile.role !== "admin" && profile.role !== "manager")
  ) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." as const, supabase };
  }

  return { supabase, user, profile, error: null as null };
}

function isMissingTable(msg?: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("employee_contracts") ||
    m.includes("contract_score_criteria") ||
    m.includes("schema cache") ||
    m.includes("pgrst205") ||
    m.includes("does not exist")
  );
}

export async function saveContractScoreCriterionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const id = String(formData.get("id") || "").trim();
  const label = String(formData.get("label") || "").trim();
  const maxPoints = Number(formData.get("maxPoints") || 10);
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!label) return { error: "ناوی خاڵبەندی پێویستە." };
  if (!(maxPoints > 0)) return { error: "زۆرترین خاڵ دەبێت گەورەتر لە ٠ بێت." };

  if (id) {
    const { error } = await ctx.supabase
      .from("contract_score_criteria")
      .update({
        label,
        max_points: maxPoints,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", ctx.profile.company_id);
    if (error) {
      if (isMissingTable(error.message)) {
        return {
          error:
            "خشتەی خاڵبەندی نییە — فایلەکەی FIX_employee_contracts.sql لە Supabase جێبەجێ بکە.",
        };
      }
      return { error: "نوێکردنەوە سەرنەکەوت." };
    }
  } else {
    const { error } = await ctx.supabase.from("contract_score_criteria").insert({
      company_id: ctx.profile.company_id,
      label,
      max_points: maxPoints,
      sort_order: sortOrder,
      is_active: true,
    });
    if (error) {
      if (isMissingTable(error.message)) {
        return {
          error:
            "خشتەی خاڵبەندی نییە — فایلەکەی FIX_employee_contracts.sql لە Supabase جێبەجێ بکە.",
        };
      }
      return { error: "زیادکردن سەرنەکەوت." };
    }
  }

  revalidatePath("/contracts");
  return { success: "خاڵبەندی پاشەکەوتکرا (لە داتابەیس دەمێنێتەوە)." };
}

export async function deactivateContractCriterionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "خاڵبەندی نەدۆزرایەوە." };

  const { error } = await ctx.supabase
    .from("contract_score_criteria")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "لابردن سەرنەکەوت." };
  revalidatePath("/contracts");
  return { success: "خاڵبەندی ناچالاک کرا (مێژوو دەمێنێتەوە)." };
}

export async function saveEmployeeContractAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile || !ctx.user) return { error: ctx.error };

  const id = String(formData.get("id") || "").trim();
  const designId = String(formData.get("designId") || "classic_legal").trim() as ContractDesignId;
  const holderName = String(formData.get("holderName") || "").trim();
  const profession = String(formData.get("profession") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const ageRaw = String(formData.get("age") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const contractNumber = String(formData.get("contractNumber") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const salaryNote = String(formData.get("salaryNote") || "").trim();
  const bodyCkb = String(formData.get("bodyCkb") || "").trim();
  const employeeId = String(formData.get("employeeId") || "").trim();
  const status = String(formData.get("status") || "draft").trim();
  const scoresRaw = String(formData.get("scoresJson") || "[]");

  if (!holderName) return { error: "ناو پێویستە." };
  if (!profession) return { error: "پیشە پێویستە." };

  let scores: ContractScoreLine[] = [];
  try {
    scores = JSON.parse(scoresRaw) as ContractScoreLine[];
    if (!Array.isArray(scores)) scores = [];
  } catch {
    return { error: "خاڵبەندی نادروستە." };
  }

  const age = ageRaw ? Number(ageRaw) : null;
  if (ageRaw && (!Number.isFinite(age) || (age as number) < 14 || (age as number) > 100)) {
    return { error: "تەمەن نادروستە." };
  }

  const payload = {
    design_id: designId,
    holder_name: holderName,
    profession,
    phone: phone || null,
    age,
    address: address || null,
    contract_number: contractNumber || null,
    start_date: startDate || null,
    end_date: endDate || null,
    salary_note: salaryNote || null,
    body_ckb: bodyCkb || null,
    scores,
    status: ["draft", "active", "ended", "cancelled"].includes(status)
      ? status
      : "draft",
    employee_id: employeeId || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await ctx.supabase
      .from("employee_contracts")
      .update(payload)
      .eq("id", id)
      .eq("company_id", ctx.profile.company_id);
    if (error) {
      if (isMissingTable(error.message)) {
        return {
          error:
            "خشتەی گرێبەست نییە — فایلەکەی FIX_employee_contracts.sql لە Supabase جێبەجێ بکە.",
        };
      }
      return { error: "پاشەکەوتکردن سەرنەکەوت." };
    }
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    return { success: "گرێبەست نوێکرایەوە.", id };
  }

  const { data, error } = await ctx.supabase
    .from("employee_contracts")
    .insert({
      ...payload,
      company_id: ctx.profile.company_id,
      created_by: ctx.user.id,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error && isMissingTable(error.message)) {
      return {
        error:
          "خشتەی گرێبەست نییە — فایلەکەی FIX_employee_contracts.sql لە Supabase جێبەجێ بکە.",
      };
    }
    return { error: "دروستکردن سەرنەکەوت." };
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${data.id}`);
  return { success: "گرێبەست پاشەکەوتکرا.", id: data.id };
}

export async function deleteEmployeeContractAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "گرێبەست نەدۆزرایەوە." };

  const { error } = await ctx.supabase
    .from("employee_contracts")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "سڕینەوە سەرنەکەوت." };
  revalidatePath("/contracts");
  return { success: "گرێبەست سڕایەوە." };
}
