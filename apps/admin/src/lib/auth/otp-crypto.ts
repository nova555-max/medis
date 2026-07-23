import { createHash, randomBytes, randomInt } from "crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashEmail(email: string) {
  return sha256(email.trim().toLowerCase());
}

export function hashOtp(code: string, email: string) {
  // Bind code to email + app pepper so stolen hashes aren't reusable blindly
  const pepper = process.env.OTP_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || "media-office";
  return sha256(`${pepper}:${email.trim().toLowerCase()}:${code}`);
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePasswordRules(password: string): {
  ok: boolean;
  message: string;
} {
  if (password.length < 8) {
    return { ok: false, message: "وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "لانیکەم یەک پیتی گەورە (A-Z) پێویستە." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "لانیکەم یەک پیتی بچووک (a-z) پێویستە." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "لانیکەم یەک ژمارە پێویستە." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      ok: false,
      message: "لانیکەم یەک هێمای تایبەت پێویستە (!@#$٪...).",
    };
  }
  return { ok: true, message: "" };
}
