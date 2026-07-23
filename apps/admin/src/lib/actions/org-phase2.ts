"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; success?: string };

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

export async function createBranchAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  if (!name) return { error: "ناوی لق پێویستە." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase.from("branches").insert({
    company_id: ctx.profile.company_id,
    name,
    address: address || null,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "ئەم لقە پێشتر هەیە." : "زیادکردن سەرنەکەوت.",
    };
  }
  revalidatePath("/branches");
  return { success: "لق زیادکرا." };
}

export async function deleteBranchAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("branches")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);
  if (error) return { error: "سڕینەوە سەرنەکەوت." };
  revalidatePath("/branches");
  return { success: "لق سڕایەوە." };
}

export async function createShiftAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const startTime = String(formData.get("startTime") || "").trim();
  const endTime = String(formData.get("endTime") || "").trim();
  const grace = Number(formData.get("grace") || 15);
  if (!name || !startTime || !endTime) return { error: "ناو و کاتەکان پێویستن." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase.from("shifts").insert({
    company_id: ctx.profile.company_id,
    name,
    start_time: startTime,
    end_time: endTime,
    late_grace_minutes: grace || 15,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "ئەم شفتە پێشتر هەیە." : "زیادکردن سەرنەکەوت.",
    };
  }
  revalidatePath("/shifts");
  return { success: "شفت زیادکرا." };
}

export async function deleteShiftAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("shifts")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);
  if (error) return { error: "سڕینەوە سەرنەکەوت." };
  revalidatePath("/shifts");
  return { success: "شفت سڕایەوە." };
}

export async function createHolidayAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const holidayDate = String(formData.get("holidayDate") || "").trim();
  const branchId = String(formData.get("branchId") || "").trim();
  const recurring = formData.get("recurring") === "on";
  if (!name || !holidayDate) return { error: "ناو و بەروار پێویستن." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase.from("holidays").insert({
    company_id: ctx.profile.company_id,
    name,
    holiday_date: holidayDate,
    branch_id: branchId || null,
    is_recurring_yearly: recurring,
  });
  if (error) return { error: "زیادکردن سەرنەکەوت." };
  revalidatePath("/holidays");
  return { success: "پشوو زیادکرا." };
}

export async function deleteHolidayAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("holidays")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.profile.company_id);
  if (error) return { error: "سڕینەوە سەرنەکەوت." };
  revalidatePath("/holidays");
  return { success: "پشوو سڕایەوە." };
}

export async function assignEmployeeOrgAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const employeeId = String(formData.get("employeeId") || "").trim();
  const branchId = String(formData.get("branchId") || "").trim();
  const shiftId = String(formData.get("shiftId") || "").trim();
  if (!employeeId) return { error: "کارمەند نەدۆزرایەوە." };

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("employees")
    .update({
      branch_id: branchId || null,
      shift_id: shiftId || null,
    })
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "پاشەکەوت سەرنەکەوت." };
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  return { success: "شفت پاشەکەوتکرا." };
}
