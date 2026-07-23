"use server";

import { registerCompanySchema } from "@media-office/shared";
import { isValidEmail } from "@/lib/auth/otp-crypto";
import {
  getAdminRegistrationStatus,
  MAX_ADMIN_ACCOUNTS,
} from "@/lib/auth/admin-slots";
import {
  provisionWorkspaceWithServiceRole,
  slugifyCompany,
} from "@/lib/auth/provision-workspace";
import {
  assertAnonKey,
  assertServiceRoleKey,
  getPublicSupabaseEnv,
  getServiceRoleKey,
} from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";

export type RegisterOtpState = {
  error?: string;
  success?: string;
  email?: string;
};

function mapKeyError(message: string): string | null {
  const msg = message.toLowerCase();
  if (
    msg.includes("invalid api key") ||
    msg.includes("jwt") ||
    msg.includes("supabase_anon_key_invalid") ||
    msg.includes("supabase_service_key_invalid") ||
    msg.includes("supabase_env_missing") ||
    msg.includes("supabase_service_env_missing")
  ) {
    return "کلیلی Supabase هەڵەیە یان لەگەڵ پڕۆژەکە ناگونجێت. لە Netlify دڵنیابە لە NEXT_PUBLIC_SUPABASE_URL، NEXT_PUBLIC_SUPABASE_ANON_KEY (anon) و SUPABASE_SERVICE_ROLE_KEY (service_role) — پاشان Redeploy بکە.";
  }
  return null;
}

function preflightEnv(): string | null {
  const { url, anonKey, ok } = getPublicSupabaseEnv();
  if (!ok) {
    return "ڕێکخستنی Supabase ناتەواوە (URL/ANON). گۆڕاوەکانی Netlify بپشکنە.";
  }
  const anonProblem = assertAnonKey(url, anonKey);
  if (anonProblem) return mapKeyError(anonProblem) || anonProblem;

  if (hasServiceRoleKey()) {
    const serviceProblem = assertServiceRoleKey(url, getServiceRoleKey());
    if (serviceProblem) return mapKeyError(serviceProblem) || serviceProblem;
  }
  return null;
}

async function emailAlreadyTaken(email: string): Promise<boolean | "unknown"> {
  if (!hasServiceRoleKey()) return "unknown";
  try {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (profile) return true;

    const { data, error } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error || !data?.users) return "unknown";
    return data.users.some(
      (u) => (u.email || "").trim().toLowerCase() === email,
    );
  } catch {
    return "unknown";
  }
}

async function registerViaServiceRole(input: {
  email: string;
  password: string;
  companyName: string;
}): Promise<RegisterOtpState> {
  const service = createServiceClient();
  const { email, password, companyName } = input;

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: companyName,
        role: "admin",
      },
    });

  if (createError || !created.user) {
    const msg = createError?.message || "";
    const mapped = mapKeyError(msg);
    if (mapped) return { error: mapped };
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return { error: "ئەم ئیمەیڵە پێشتر تۆمارکراوە. تکایە بچۆ ژوورەوە." };
    }
    return {
      error: `دروستکردنی هەژمار سەرنەکەوت: ${createError?.message || "هەڵەی نەناسراو"}`,
    };
  }

  const userId = created.user.id;
  const provisioned = await provisionWorkspaceWithServiceRole({
    userId,
    companyName,
    slug: slugifyCompany(companyName),
    fullName: companyName,
    email,
    phone: null,
  });

  if (!provisioned.companyId) {
    try {
      await service.auth.admin.deleteUser(userId);
    } catch {
      // ignore
    }
    if (provisioned.error === "CLOSED") {
      return {
        error: `دروستکردنی هەژماری ئەدمین داخراوە. تەنها ${MAX_ADMIN_ACCOUNTS} هەژمار ڕێگەپێدراوە.`,
      };
    }
    return {
      error: `شوێنی کاری کۆمپانیا سەرنەکەوت${provisioned.error ? `: ${provisioned.error}` : ""}.`,
    };
  }

  return signInAfterRegister(email, password);
}

async function registerViaSignUp(input: {
  email: string;
  password: string;
  companyName: string;
}): Promise<RegisterOtpState> {
  const { email, password, companyName } = input;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: companyName,
        role: "admin",
      },
    },
  });

  if (error) {
    const mapped = mapKeyError(error.message);
    if (mapped) return { error: mapped };
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return { error: "ئەم ئیمەیڵە پێشتر تۆمارکراوە. تکایە بچۆ ژوورەوە." };
    }
    return { error: `دروستکردنی هەژمار سەرنەکەوت: ${error.message}` };
  }

  if (!data.user) {
    return { error: "دروستکردنی هەژمار سەرنەکەوت. دووبارە هەوڵبدەرەوە." };
  }

  // Email confirmation required and no session yet — confirm via service role if available
  if (!data.session && hasServiceRoleKey()) {
    const service = createServiceClient();
    await service.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return {
        error:
          "هەژمار دروستبوو بەڵام چوونەژوورەوە سەرنەکەوت. تکایە لە پەڕەی چوونەژوورەوە هەوڵبدەرەوە.",
        email,
      };
    }
  } else if (!data.session) {
    return {
      error:
        "پێویستە ئیمەیڵ پشتڕاست بکرێتەوە یان SUPABASE_SERVICE_ROLE_KEY لە Netlify دابنرێت.",
      email,
    };
  }

  const slug = slugifyCompany(companyName);
  const { data: companyId, error: rpcError } = await supabase.rpc(
    "register_company_workspace",
    {
      p_company_name: companyName,
      p_slug: slug,
      p_full_name: companyName,
      p_email: email,
      p_phone: null,
    },
  );

  if (rpcError || !companyId) {
    const msg = (rpcError?.message || "").toLowerCase();
    if (msg.includes("closed")) {
      return {
        error: `دروستکردنی هەژماری ئەدمین داخراوە. تەنها ${MAX_ADMIN_ACCOUNTS} هەژمار ڕێگەپێدراوە.`,
      };
    }
    if (msg.includes("already")) {
      return { success: "ok", email };
    }
    // Fallback: provision with service role if RPC failed
    if (hasServiceRoleKey()) {
      const provisioned = await provisionWorkspaceWithServiceRole({
        userId: data.user.id,
        companyName,
        slug,
        fullName: companyName,
        email,
        phone: null,
      });
      if (provisioned.companyId) {
        return { success: "ok" };
      }
    }
    return {
      error: `شوێنی کاری کۆمپانیا سەرنەکەوت${rpcError?.message ? `: ${rpcError.message}` : ""}.`,
    };
  }

  return { success: "ok" };
}

async function signInAfterRegister(
  email: string,
  password: string,
): Promise<RegisterOtpState> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { success: "ok", email };
  }

  await supabase.auth.signOut();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { success: "ok", email };
  }

  return { success: "ok" };
}

/** Create company admin account immediately (no email OTP). */
export async function registerAction(
  _prev: RegisterOtpState,
  formData: FormData,
): Promise<RegisterOtpState> {
  const envError = preflightEnv();
  if (envError) return { error: envError };

  const slots = await getAdminRegistrationStatus();
  if (slots.known && slots.used >= slots.maxAllowed) {
    return {
      error: `دروستکردنی هەژماری ئەدمین داخراوە. تەنها ${slots.maxAllowed} هەژمار ڕێگەپێدراوە.`,
    };
  }

  const parsed = registerCompanySchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "تکایە هەموو خانە پێویستەکان بە دروستی پڕبکەرەوە (وشەی نهێنی لانیکەم ٨ پیت)." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { companyName, password } = parsed.data;

  if (!isValidEmail(email)) {
    return { error: "تکایە ئیمەیڵێکی دروست بنووسە." };
  }

  const taken = await emailAlreadyTaken(email);
  if (taken === true) {
    return { error: "ئەم ئیمەیڵە پێشتر تۆمارکراوە. تکایە بچۆ ژوورەوە." };
  }

  // Prefer service-role path (auto-confirm email, reliable on Netlify when key is set)
  if (hasServiceRoleKey()) {
    try {
      return await registerViaServiceRole({ email, password, companyName });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const mapped = mapKeyError(msg);
      if (mapped) return { error: mapped };
      return {
        error: `دروستکردنی هەژمار سەرنەکەوت${msg ? `: ${msg}` : ""}.`,
      };
    }
  }

  // Fallback without service role
  try {
    return await registerViaSignUp({ email, password, companyName });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const mapped = mapKeyError(msg);
    if (mapped) return { error: mapped };
    return {
      error: `دروستکردنی هەژمار سەرنەکەوت${msg ? `: ${msg}` : ""}. SUPABASE_SERVICE_ROLE_KEY لە Netlify دابنێ.`,
    };
  }
}
