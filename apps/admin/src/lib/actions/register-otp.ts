"use server";

import { registerCompanySchema } from "@media-office/shared";
import { isValidEmail } from "@/lib/auth/otp-crypto";
import { getAdminRegistrationStatus } from "@/lib/auth/admin-slots";
import {
  provisionWorkspaceWithServiceRole,
  slugifyCompany,
} from "@/lib/auth/provision-workspace";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type RegisterOtpState = {
  error?: string;
  success?: string;
  email?: string;
};

async function emailAlreadyTaken(email: string): Promise<boolean> {
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
  if (error || !data?.users) return false;
  return data.users.some(
    (u) => (u.email || "").trim().toLowerCase() === email,
  );
}

/** Create company admin account immediately (no email OTP). */
export async function registerAction(
  _prev: RegisterOtpState,
  formData: FormData,
): Promise<RegisterOtpState> {
  const slots = await getAdminRegistrationStatus();
  if (slots.used >= slots.maxAllowed) {
    return {
      error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
    };
  }

  const parsed = registerCompanySchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "تکایە هەموو خانە پێویستەکان بە دروستی پڕبکەرەوە." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { companyName, password } = parsed.data;

  if (!isValidEmail(email)) {
    return { error: "تکایە ئیمەیڵێکی دروست بنووسە." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return {
      error:
        "ڕێکخستنی سێرڤەر ناتەواوە (SERVICE_ROLE). تکایە .env.local بپشکنە.",
    };
  }

  try {
    if (await emailAlreadyTaken(email)) {
      return { error: "ئەم ئیمەیڵە پێشتر تۆمارکراوە." };
    }
  } catch {
    return {
      error: "پشکنینی ئیمەیڵ سەرنەکەوت. دووبارە هەوڵبدەرەوە.",
    };
  }

  const slotsAgain = await getAdminRegistrationStatus();
  if (slotsAgain.used >= slotsAgain.maxAllowed) {
    return {
      error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
    };
  }

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
    if (msg.toLowerCase().includes("already")) {
      return { error: "ئەم ئیمەیڵە پێشتر تۆمارکراوە." };
    }
    return { error: "دروستکردنی هەژمار سەرنەکەوت. دووبارە هەوڵبدەرەوە." };
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
        error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
      };
    }
    return { error: "شوێنی کاری کۆمپانیا سەرنەکەوت. دووبارە هەوڵبدەرەوە." };
  }

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
