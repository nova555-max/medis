"use server";

import { redirect } from "next/navigation";
import { registerCompanySchema, loginSchema } from "@media-office/shared";
import { createClient } from "@/lib/supabase/server";

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .slice(0, 48);
  return `${base || "company"}-${Math.random().toString(36).slice(2, 8)}`;
}

export type AuthState = {
  error?: string;
  success?: string;
};

const ENV_ERROR =
  "پەیوەندی Supabase ڕێکنەکراوە. فایل apps/admin/.env.local بپشکنە و سێرڤەر دووبارە دەستپێبکەرەوە.";

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "زانیارییەکان نادروستن." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: ENV_ERROR };
  }

  // پاککردنەوەی سێشنی پێشوو (بۆ نموونە کارمەند) پێش لۆگینی ئەدمین
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "ئیمەیڵ یان وشەی نهێنی هەڵەیە." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "چوونەژوورەوە سەرنەکەوت." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    await supabase.auth.signOut();
    return {
      error:
        "ئەم پانێڵە تەنها بۆ بەڕێوەبەرە. کارمەندان ئەپی کارمەند بەکاربهێنن.",
    };
  }

  return { success: "ok" };
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerCompanySchema.safeParse({
    companyName: formData.get("companyName"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: "تکایە هەموو خانە پێویستەکان بە دروستی پڕبکەرەوە." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: ENV_ERROR };
  }

  const { companyName, fullName, email, password, phone } = parsed.data;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "admin",
      },
    },
  });

  if (signUpError || !authData.user) {
    return {
      error:
        signUpError?.message?.includes("already")
          ? "ئەم ئیمەیڵە پێشتر تۆمارکراوە."
          : "دروستکردنی هەژمار سەرنەکەوت. دووبارە هەوڵبدەرەوە.",
    };
  }

  const { data: companyId, error: rpcError } = await supabase.rpc(
    "register_company_workspace",
    {
      p_company_name: companyName,
      p_slug: slugify(companyName),
      p_full_name: fullName,
      p_email: email,
      p_phone: phone ?? null,
    },
  );

  if (rpcError || !companyId) {
    return {
      error:
        "هەژمار دروستبوو بەڵام شوێنی کاری کۆمپانیا سەرنەکەوت. پەیوەندی بە پشتگیری بکە.",
    };
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
