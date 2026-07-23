"use server";

import { redirect } from "next/navigation";
import { registerCompanySchema, loginSchema } from "@media-office/shared";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getAdminRegistrationStatus,
  MAX_ADMIN_ACCOUNTS,
} from "@/lib/auth/admin-slots";

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

/** Creates company + admin profile when RPC cannot run (no session / confirm-email). */
async function provisionWorkspaceWithServiceRole(input: {
  userId: string;
  companyName: string;
  slug: string;
  fullName: string;
  email: string;
  phone?: string | null;
}): Promise<{ companyId?: string; error?: string }> {
  let service;
  try {
    service = createServiceClient();
  } catch {
    return { error: "SERVICE_ROLE" };
  }

  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if ((count ?? 0) >= MAX_ADMIN_ACCOUNTS) {
    return { error: "CLOSED" };
  }

  const { data: existing } = await service
    .from("profiles")
    .select("id, company_id")
    .eq("id", input.userId)
    .maybeSingle();
  if (existing?.company_id) {
    return { companyId: existing.company_id as string };
  }

  const { data: company, error: companyError } = await service
    .from("companies")
    .insert({ name: input.companyName, slug: input.slug })
    .select("id")
    .single();
  if (companyError || !company) {
    return { error: companyError?.message || "COMPANY" };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: input.userId,
    company_id: company.id,
    role: "admin",
    full_name: input.fullName,
    phone: input.phone ?? null,
    email: input.email,
  });
  if (profileError) {
    await service.from("companies").delete().eq("id", company.id);
    return { error: profileError.message };
  }

  await service.from("leave_types").insert([
    {
      company_id: company.id,
      code: "annual",
      name_ckb: "مۆڵەتی ساڵانە",
      is_paid: true,
      annual_allowance_days: 21,
    },
    {
      company_id: company.id,
      code: "sick",
      name_ckb: "مۆڵەتی نەخۆشی",
      is_paid: true,
      annual_allowance_days: 14,
    },
    {
      company_id: company.id,
      code: "unpaid",
      name_ckb: "مۆڵەتی بێ مووچە",
      is_paid: false,
      annual_allowance_days: 0,
    },
  ]);

  await service.from("activity_logs").insert({
    company_id: company.id,
    actor_id: input.userId,
    action: "company.registered",
    entity_type: "company",
    entity_id: company.id,
    metadata: { name: input.companyName },
  });

  return { companyId: company.id as string };
}

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
  const slots = await getAdminRegistrationStatus();
  if (slots.used >= slots.maxAllowed) {
    return {
      error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
    };
  }

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
  const slug = slugify(companyName);

  const slotsAgain = await getAdminRegistrationStatus();
  if (slotsAgain.used >= slotsAgain.maxAllowed) {
    return {
      error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
    };
  }

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

  const userId = authData.user.id;

  // Ensure a real session (signup may return user without session if confirm-email is on)
  if (!authData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      // User exists in Auth but cannot sign in yet — try service-role provisioning
      const provisioned = await provisionWorkspaceWithServiceRole({
        userId,
        companyName,
        slug,
        fullName,
        email,
        phone,
      });
      if (provisioned.companyId) {
        return {
          error:
            "هەژمار دروستبوو. تکایە ئیمەیڵەکەت پشتڕاست بکەرەوە، پاشان بچۆ ژوورەوە.",
        };
      }
      return {
        error:
          "هەژمار دروستبوو بەڵام پێویستە ئیمەیڵ پشتڕاست بکرێتەوە پێش چوونەژوورەوە. لە Supabase: Authentication → Providers → Email → Confirm email بکە Off.",
      };
    }
  }

  let companyId: string | null = null;
  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "register_company_workspace",
    {
      p_company_name: companyName,
      p_slug: slug,
      p_full_name: fullName,
      p_email: email,
      p_phone: phone ?? null,
    },
  );

  if (!rpcError && rpcId) {
    companyId = String(rpcId);
  } else {
    const msg = rpcError?.message || "";
    if (msg.includes("admin registration closed")) {
      return {
        error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
      };
    }
    if (msg.includes("profile already exists")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.company_id) {
        return { success: "ok" };
      }
    }

    const provisioned = await provisionWorkspaceWithServiceRole({
      userId,
      companyName,
      slug,
      fullName,
      email,
      phone,
    });
    if (provisioned.error === "CLOSED") {
      return {
        error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
      };
    }
    if (!provisioned.companyId) {
      return {
        error:
          "هەژمار دروستبوو بەڵام شوێنی کاری کۆمپانیا سەرنەکەوت. دووبارە هەوڵبدەرەوە یان پەیوەندی بە پشتگیری بکە.",
      };
    }
    companyId = provisioned.companyId;
  }

  if (!companyId) {
    return {
      error:
        "هەژمار دروستبوو بەڵام شوێنی کاری کۆمپانیا سەرنەکەوت. پەیوەندی بە پشتگیری بکە.",
    };
  }

  // Same as login: return success and let the client navigate (avoids NEXT_REDIRECT crash with useActionState)
  return { success: "ok" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
