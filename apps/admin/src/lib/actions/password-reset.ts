"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  generateOtpCode,
  generateResetToken,
  hashEmail,
  hashOtp,
  isValidEmail,
  sha256,
  validatePasswordRules,
} from "@/lib/auth/otp-crypto";
import { sendPasswordOtpEmail } from "@/lib/email/resend";
import { createServiceClient } from "@/lib/supabase/service";

export type OtpState = {
  error?: string;
  success?: string;
  email?: string;
  expiresAt?: string;
};

const RESET_COOKIE = "mo_pwd_reset";
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

function clientIp(hdrs: Headers) {
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null
  );
}

async function logReset(
  service: ReturnType<typeof createServiceClient>,
  params: {
    companyId?: string | null;
    actorId?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    if (!params.companyId) return;
    await service.from("activity_logs").insert({
      company_id: params.companyId,
      actor_id: params.actorId || null,
      action: params.action,
      entity_type: "auth",
      entity_id: params.actorId || null,
      metadata: params.metadata || {},
    });
  } catch {
    // ignore
  }
}

async function rateLimitSend(
  service: ReturnType<typeof createServiceClient>,
  email: string,
  ip: string | null,
) {
  // Reuse existing attempts table when available
  const { data, error } = await service.rpc("request_password_reset_allowed", {
    p_email: email,
    p_ip: ip,
  });
  if (error) {
    console.error("otp rate limit:", error.message);
    return true;
  }
  return data !== false;
}

/** Step 1 — request OTP */
export async function requestPasswordOtpAction(
  _prev: OtpState,
  formData: FormData,
): Promise<OtpState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email || !isValidEmail(email)) {
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

  const hdrs = await headers();
  const ip = clientIp(hdrs);
  const allowed = await rateLimitSend(service, email, ip);
  if (!allowed) {
    return {
      error: "زۆر هەوڵدرا. تکایە ١٠ خولەک چاوەڕوان بە و دووبارە هەوڵ بدەوە.",
    };
  }

  const emailHash = hashEmail(email);
  const ipHash = ip ? sha256(ip) : null;
  const code = generateOtpCode();
  const codeHash = hashOtp(code, email);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // Invalidate previous active OTPs for this email
  await service
    .from("password_reset_otps")
    .delete()
    .eq("email_hash", emailHash)
    .is("consumed_at", null);

  // Find staff user (admin/manager) — do not reveal result
  const { data: profile } = await service
    .from("profiles")
    .select("id, company_id, role, is_active")
    .eq("email", email)
    .maybeSingle();

  let userId: string | null = null;
  let companyId: string | null = null;
  let companyName = "Media Office";
  let companyLogoUrl: string | null = null;

  if (
    profile &&
    profile.is_active &&
    (profile.role === "admin" || profile.role === "manager")
  ) {
    userId = profile.id;
    companyId = profile.company_id;
    if (profile.company_id) {
      const { data: company } = await service
        .from("companies")
        .select("name, logo_url")
        .eq("id", profile.company_id)
        .maybeSingle();
      if (company?.name) companyName = company.name;
      if (company?.logo_url) companyLogoUrl = company.logo_url;
    }
  }

  // Only create + send OTP when a valid staff account exists
  if (userId) {
    const { error: insertErr } = await service
      .from("password_reset_otps")
      .insert({
        email_hash: emailHash,
        user_id: userId,
        code_hash: codeHash,
        expires_at: expiresAt,
        ip_hash: ipHash,
      });

    if (insertErr) {
      console.error("otp insert:", insertErr.message);
      return { error: "دروستکردنی کۆد سەرنەکەوت. دووبارە هەوڵ بدەوە." };
    }

    await logReset(service, {
      companyId,
      actorId: userId,
      action: "auth.password_otp_requested",
      metadata: { email_hash: emailHash },
    });

    try {
      await sendPasswordOtpEmail({
        to: email,
        code,
        companyName,
        logoUrl: companyLogoUrl,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      console.error("otp email:", msg);
      // Still redirect — do not reveal whether account exists
    }
  } else {
    await logReset(service, {
      companyId: null,
      actorId: null,
      action: "auth.password_otp_requested_unknown",
      metadata: { email_hash: emailHash },
    });
  }

  // Anti-enumeration: always continue to verify page
  redirect(
    `/verify-otp?email=${encodeURIComponent(email)}&expires=${encodeURIComponent(expiresAt)}`,
  );
}

/** Resend OTP (same as request) */
export async function resendPasswordOtpAction(
  _prev: OtpState,
  formData: FormData,
): Promise<OtpState> {
  return requestPasswordOtpAction(_prev, formData);
}

/** Step 2 — verify OTP → set httpOnly reset cookie */
export async function verifyPasswordOtpAction(
  _prev: OtpState,
  formData: FormData,
): Promise<OtpState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") || "")
    .replace(/\D/g, "")
    .slice(0, 6);

  if (!email || !isValidEmail(email)) {
    return { error: "ئیمەیڵ نادروستە." };
  }
  if (code.length !== 6) {
    return { error: "کۆدی ٦ ژمارەیی بنووسە." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  const emailHash = hashEmail(email);
  const { data: rows } = await service
    .from("password_reset_otps")
    .select("*")
    .eq("email_hash", emailHash)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0] as
    | {
        id: string;
        user_id: string | null;
        code_hash: string;
        attempts: number;
        max_attempts: number;
        expires_at: string;
        verified_at: string | null;
      }
    | undefined;

  // Constant-ish failure for missing / phantom
  if (!row) {
    return { error: "کۆد نادروستە یان بەسەرچووە." };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await service.from("password_reset_otps").delete().eq("id", row.id);
    return { error: "کۆد بەسەرچووە. تکایە کۆدی نوێ داوا بکە." };
  }

  if (row.attempts >= row.max_attempts) {
    await service.from("password_reset_otps").delete().eq("id", row.id);
    return {
      error: "زۆر هەوڵی هەڵە درا. تکایە کۆدی نوێ داوا بکە.",
    };
  }

  const expected = hashOtp(code, email);
  if (expected !== row.code_hash || !row.user_id) {
    await service
      .from("password_reset_otps")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);

    const left = row.max_attempts - (row.attempts + 1);
    await logReset(service, {
      companyId: null,
      actorId: row.user_id,
      action: "auth.password_otp_failed",
      metadata: { attempts: row.attempts + 1 },
    });

    return {
      error:
        left > 0
          ? `کۆد هەڵەیە. ${left} هەوڵ ماوە.`
          : "زۆر هەوڵی هەڵە درا. تکایە کۆدی نوێ داوا بکە.",
    };
  }

  const resetToken = generateResetToken();
  const resetTokenHash = sha256(resetToken);
  const resetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await service
    .from("password_reset_otps")
    .update({
      verified_at: new Date().toISOString(),
      reset_token_hash: resetTokenHash,
      reset_token_expires_at: resetExpires,
      // Invalidate code after verify (one-time)
      code_hash: sha256(`used:${row.id}:${Date.now()}`),
    })
    .eq("id", row.id);

  const { data: profile } = await service
    .from("profiles")
    .select("company_id")
    .eq("id", row.user_id)
    .maybeSingle();

  await logReset(service, {
    companyId: profile?.company_id,
    actorId: row.user_id,
    action: "auth.password_otp_verified",
  });

  const jar = await cookies();
  jar.set(RESET_COOKIE, resetToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  redirect("/reset-password");
}

/** Step 3 — set new password using verified reset cookie */
export async function setPasswordWithOtpAction(
  _prev: OtpState,
  formData: FormData,
): Promise<OtpState> {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  const strength = validatePasswordRules(password);
  if (!strength.ok) return { error: strength.message };
  if (password !== confirm) {
    return { error: "وشەی نهێنی و دووبارەکردنەوە یەک ناگرنەوە." };
  }

  const jar = await cookies();
  const resetToken = jar.get(RESET_COOKIE)?.value;
  if (!resetToken) {
    return {
      error: "دەستووری گۆڕینەوە بەسەرچووە. تکایە دووبارە دەست پێ بکە.",
    };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { error: "ڕێکخستنی سێرڤەر ناتەواوە." };
  }

  const tokenHash = sha256(resetToken);
  const { data: rows } = await service
    .from("password_reset_otps")
    .select("*")
    .eq("reset_token_hash", tokenHash)
    .is("consumed_at", null)
    .limit(1);

  const row = rows?.[0] as
    | {
        id: string;
        user_id: string | null;
        reset_token_expires_at: string | null;
        verified_at: string | null;
      }
    | undefined;

  if (!row?.user_id || !row.verified_at) {
    jar.delete(RESET_COOKIE);
    return { error: "دەستووری گۆڕینەوە نادروستە. دووبارە دەست پێ بکە." };
  }

  if (
    !row.reset_token_expires_at ||
    new Date(row.reset_token_expires_at).getTime() < Date.now()
  ) {
    jar.delete(RESET_COOKIE);
    await service.from("password_reset_otps").delete().eq("id", row.id);
    return { error: "دەستووری گۆڕینەوە بەسەرچووە. دووبارە دەست پێ بکە." };
  }

  const { error: updErr } = await service.auth.admin.updateUserById(
    row.user_id,
    { password },
  );

  if (updErr) {
    return { error: "گۆڕینی وشەی نهێنی سەرنەکەوت. دووبارە هەوڵ بدەوە." };
  }

  await service
    .from("password_reset_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  // Delete OTP row after success
  await service.from("password_reset_otps").delete().eq("id", row.id);

  const { data: profile } = await service
    .from("profiles")
    .select("company_id")
    .eq("id", row.user_id)
    .maybeSingle();

  await logReset(service, {
    companyId: profile?.company_id,
    actorId: row.user_id,
    action: "auth.password_reset_completed",
    metadata: { via: "otp" },
  });

  jar.delete(RESET_COOKIE);

  redirect("/reset-password/success");
}
