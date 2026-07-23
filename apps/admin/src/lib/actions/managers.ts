"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ManagerState = { error?: string; success?: string };

export async function createManagerAction(
  _prev: ManagerState,
  formData: FormData,
): Promise<ManagerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "تکایە بچۆ ژوورەوە." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "تەنها خاوەن ئەدمین دەتوانێت یاریدەدەر دروست بکات." };
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (fullName.length < 2) return { error: "ناو پێویستە." };
  if (!email.includes("@")) return { error: "ئیمەیڵ نادروستە." };
  if (password.length < 8) return { error: "وشەی نهێنی لانیکەم ٨ پیت." };

  const { error } = await supabase.rpc("admin_create_manager", {
    p_full_name: fullName,
    p_email: email,
    p_password: password,
  });

  if (error) {
    if (error.message.includes("email already")) {
      return { error: "ئەم ئیمەیڵە پێشتر بەکارهاتووە." };
    }
    return { error: "دروستکردنی یاریدەدەر سەرنەکەوت: " + error.message };
  }

  revalidatePath("/settings");
  return { success: "یاریدەدەری ئەدمین دروستکرا — دەتوانێت بچێتە ژوورەوە." };
}
