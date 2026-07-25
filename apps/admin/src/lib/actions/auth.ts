"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@media-office/shared";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
  email?: string;
  expiresAt?: string;
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

  // Do not signOut first — clears cookies mid-request and can break sign-in on Netlify/SSR
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("login profile:", profileError.message);
    await supabase.auth.signOut();
    return { error: "نەتوانرا پرۆفایل بخوێنرێتەوە. دووبارە هەوڵ بدە." };
  }

  const isStaff =
    profile?.role === "admin" || profile?.role === "manager";

  if (!profile || !isStaff || !profile.is_active || !profile.company_id) {
    await supabase.auth.signOut();
    return {
      error:
        "ئەم پانێڵە تەنها بۆ بەڕێوەبەرە. کارمەندان ئەپی کارمەند بەکاربهێنن.",
    };
  }

  return { success: "ok" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
