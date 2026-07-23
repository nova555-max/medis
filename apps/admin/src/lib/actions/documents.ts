"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." as const, supabase };
  }

  return { supabase, user, profile, error: null };
}

export async function uploadEmployeeDocumentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const employeeId = String(formData.get("employeeId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const file = formData.get("file");

  if (!employeeId || !title) return { error: "ناونیشان پێویستە." };
  if (!(file instanceof File) || file.size < 1) {
    return { error: "فایل هەڵبژێرە." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "قەبارەی فایل نابێت لە ١٠MB زیاتر بێت." };
  }

  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { data: emp } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();
  if (!emp) return { error: "کارمەند نەدۆزرایەوە." };

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${ctx.profile.company_id}/${employeeId}/${Date.now()}-${safeName}`;

  const { error: upError } = await ctx.supabase.storage
    .from("documents")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upError) return { error: "بارکردنی فایل سەرنەکەوت." };

  const { error } = await ctx.supabase.from("employee_documents").insert({
    company_id: ctx.profile.company_id,
    employee_id: employeeId,
    title,
    file_path: path,
    file_type: file.type || null,
    file_size: file.size,
    uploaded_by: ctx.user!.id,
  });

  if (error) {
    await ctx.supabase.storage.from("documents").remove([path]);
    return { error: "تۆمارکردنی بەڵگەنامە سەرنەکەوت." };
  }

  revalidatePath(`/employees/${employeeId}`);
  return { success: "بەڵگەنامە بارکرا." };
}

export async function deleteEmployeeDocumentAction(
  documentId: string,
  employeeId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  const { data: doc } = await ctx.supabase
    .from("employee_documents")
    .select("id, file_path")
    .eq("id", documentId)
    .eq("company_id", ctx.profile.company_id)
    .maybeSingle();
  if (!doc) return { error: "بەڵگەنامە نەدۆزرایەوە." };

  await ctx.supabase.storage.from("documents").remove([doc.file_path]);
  const { error } = await ctx.supabase
    .from("employee_documents")
    .delete()
    .eq("id", documentId)
    .eq("company_id", ctx.profile.company_id);

  if (error) return { error: "سڕینەوە سەرنەکەوت." };
  revalidatePath(`/employees/${employeeId}`);
  return { success: "بەڵگەنامە سڕایەوە." };
}

export async function getDocumentSignedUrlAction(
  filePath: string,
): Promise<{ url?: string; error?: string }> {
  const ctx = await requireAdmin();
  if (ctx.error || !ctx.profile) return { error: ctx.error };

  if (!filePath.startsWith(`${ctx.profile.company_id}/`)) {
    return { error: "دەستگەیشتن ڕەتکرایەوە." };
  }

  const { data, error } = await ctx.supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 120);

  if (error || !data?.signedUrl) return { error: "نەتوانرا لینک دروست بکرێت." };
  return { url: data.signedUrl };
}
