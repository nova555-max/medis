"use server";

import { cookies } from "next/headers";
import { registerCompanySchema } from "@media-office/shared";
import {
  generateOtpCode,
  hashOtp,
  isValidEmail,
} from "@/lib/auth/otp-crypto";
import { openJson, sealJson } from "@/lib/auth/seal";
import {
  getAdminRegistrationStatus,
} from "@/lib/auth/admin-slots";
import {
  provisionWorkspaceWithServiceRole,
  slugifyCompany,
} from "@/lib/auth/provision-workspace";
import { sendRegistrationOtpEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type RegisterOtpState = {
  error?: string;
  success?: string;
  email?: string;
  expiresAt?: string;
};

const REG_COOKIE = "mo_reg_otp";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type PendingRegistration = {
  companyName: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

async function setPendingCookie(pending: PendingRegistration) {
  const jar = await cookies();
  jar.set(REG_COOKIE, sealJson(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(OTP_TTL_MS / 1000),
  });
}

async function clearPendingCookie() {
  const jar = await cookies();
  jar.delete(REG_COOKIE);
}

async function readPending(): Promise<PendingRegistration | null> {
  const jar = await cookies();
  const raw = jar.get(REG_COOKIE)?.value;
  if (!raw) return null;
  const pending = openJson<PendingRegistration>(raw);
  if (!pending?.email || !pending.codeHash || !pending.password) return null;
  return pending;
}

async function emailAlreadyTaken(email: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profile) return true;

  // Probe Auth without listing all users
  const { data, error } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error || !data?.users) return false;
  return data.users.some(
    (u) => (u.email || "").trim().toLowerCase() === email,
  );
}

/** Step 1 — validate form, send 6-digit OTP (account not created yet). */
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
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: "تکایە هەموو خانە پێویستەکان بە دروستی پڕبکەرەوە." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { error: "تکایە ئیمەیڵێکی دروست بنووسە." };
  }

  try {
    createServiceClient();
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

  const code = generateOtpCode();
  const expiresAt = Date.now() + OTP_TTL_MS;
  const pending: PendingRegistration = {
    companyName: parsed.data.companyName,
    fullName: parsed.data.fullName,
    email,
    phone: parsed.data.phone,
    password: parsed.data.password,
    codeHash: hashOtp(code, email),
    expiresAt,
    attempts: 0,
    lastSentAt: Date.now(),
  };

  try {
    await sendRegistrationOtpEmail({
      to: email,
      code,
      companyName: parsed.data.companyName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("RESEND_API_KEY")) {
      return {
        error: "ناردنی ئیمەیڵ ڕێکنەکراوە (RESEND_API_KEY). تکایە ڕێکخستن بپشکنە.",
      };
    }
    return { error: "ناردنی کۆدی ئیمەیڵ سەرنەکەوت. دووبارە هەوڵبدەرەوە." };
  }

  await setPendingCookie(pending);

  return {
    success: "otp_sent",
    email,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

/** Resend registration OTP (same pending form data in cookie). */
export async function resendRegisterOtpAction(
  _prev: RegisterOtpState,
  formData: FormData,
): Promise<RegisterOtpState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const pending = await readPending();
  if (!pending || pending.email !== email) {
    return {
      error: "داواکاری تۆمارکردن نەدۆزرایەوە. تکایە لە سەرەتاوە تۆمار بکەرەوە.",
    };
  }

  if (Date.now() - pending.lastSentAt < 55_000) {
    return { error: "تکایە ١ خولەک چاوەڕوان بە پێش دووبارە ناردن." };
  }

  const slots = await getAdminRegistrationStatus();
  if (slots.used >= slots.maxAllowed) {
    await clearPendingCookie();
    return {
      error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
    };
  }

  const code = generateOtpCode();
  const expiresAt = Date.now() + OTP_TTL_MS;
  const next: PendingRegistration = {
    ...pending,
    codeHash: hashOtp(code, pending.email),
    expiresAt,
    attempts: 0,
    lastSentAt: Date.now(),
  };

  try {
    await sendRegistrationOtpEmail({
      to: pending.email,
      code,
      companyName: pending.companyName,
    });
  } catch {
    return { error: "ناردنی کۆدی ئیمەیڵ سەرنەکەوت. دووبارە هەوڵبدەرەوە." };
  }

  await setPendingCookie(next);

  return {
    success: "otp_sent",
    email: pending.email,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

/** Step 2 — verify OTP, then create Auth user + company workspace. */
export async function verifyRegisterOtpAction(
  _prev: RegisterOtpState,
  formData: FormData,
): Promise<RegisterOtpState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") || "").replace(/\D/g, "");

  if (!email || code.length !== 6) {
    return { error: "تکایە کۆدی ٦ ژمارەیی بنووسە." };
  }

  const pending = await readPending();
  if (!pending || pending.email !== email) {
    return {
      error: "داواکاری تۆمارکردن نەدۆزرایەوە. تکایە لە سەرەتاوە تۆمار بکەرەوە.",
    };
  }

  if (Date.now() > pending.expiresAt) {
    await clearPendingCookie();
    return { error: "کۆدەکە بەسەرچوو. تکایە دووبارە کۆد بنێرە." };
  }

  if (pending.attempts >= MAX_ATTEMPTS) {
    await clearPendingCookie();
    return { error: "زۆر هەوڵدرا. تکایە لە سەرەتاوە تۆمار بکەرەوە." };
  }

  const expected = hashOtp(code, email);
  if (expected !== pending.codeHash) {
    const next = { ...pending, attempts: pending.attempts + 1 };
    await setPendingCookie(next);
    return { error: "کۆدەکە هەڵەیە. دووبارە هەوڵبدەرەوە." };
  }

  const slots = await getAdminRegistrationStatus();
  if (slots.used >= slots.maxAllowed) {
    await clearPendingCookie();
    return {
      error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
    };
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

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: pending.email,
      password: pending.password,
      email_confirm: true,
      user_metadata: {
        full_name: pending.fullName,
        role: "admin",
      },
    });

  if (createError || !created.user) {
    const msg = createError?.message || "";
    if (msg.toLowerCase().includes("already")) {
      await clearPendingCookie();
      return { error: "ئەم ئیمەیڵە پێشتر تۆمارکراوە." };
    }
    return { error: "دروستکردنی هەژمار سەرنەکەوت. دووبارە هەوڵبدەرەوە." };
  }

  const userId = created.user.id;
  const slug = slugifyCompany(pending.companyName);
  const provisioned = await provisionWorkspaceWithServiceRole({
    userId,
    companyName: pending.companyName,
    slug,
    fullName: pending.fullName,
    email: pending.email,
    phone: pending.phone,
  });

  if (!provisioned.companyId) {
    try {
      await service.auth.admin.deleteUser(userId);
    } catch {
      // ignore cleanup failure
    }
    if (provisioned.error === "CLOSED") {
      await clearPendingCookie();
      return {
        error: "دروستکردنی هەژماری ئەدمین داخراوە. تەنها ٢ هەژمار ڕێگەپێدراوە.",
      };
    }
    return {
      error: "شوێنی کاری کۆمپانیا سەرنەکەوت. دووبارە هەوڵبدەرەوە.",
    };
  }

  await clearPendingCookie();

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      success: "ok",
      email: pending.email,
    };
  }

  await supabase.auth.signOut();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: pending.email,
    password: pending.password,
  });

  if (signInError) {
    return {
      success: "ok",
      email: pending.email,
    };
  }

  return { success: "ok" };
}
