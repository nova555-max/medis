/** Synthetic email domain for employee ID logins (Supabase still needs an email). */
export const EMPLOYEE_EMAIL_DOMAIN = "emp.mediaoffice.local";

export function employeeIdToEmail(employeeId: string) {
  const id = employeeId.trim();
  if (id.includes("@")) return id.toLowerCase();
  return `${id}@${EMPLOYEE_EMAIL_DOMAIN}`;
}

/** Digit code for browser forms (no Node crypto). */
export function generateDigitCodeClient(length = 10): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = String((bytes[0] % 9) + 1);
  for (let i = 1; i < length; i++) out += String(bytes[i] % 10);
  return out;
}

/** Letters + digits only (no symbols). Always includes both. */
const ALNUM =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateAlphanumericPasswordClient(length = 10): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const chars = Array.from(bytes, (b) => ALNUM[b % ALNUM.length]);
  // guarantee at least one letter and one digit
  const letterPool = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digitPool = "23456789";
  chars[0] = letterPool[bytes[0] % letterPool.length];
  chars[1] = digitPool[bytes[1] % digitPool.length];
  // shuffle lightly
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Server-side digit code. Uses Web Crypto when available, else Math.random. */
export function generateDigitCode(length = 10): string {
  return generateDigitCodeClient(length);
}

export function generateAlphanumericPassword(length = 10): string {
  return generateAlphanumericPasswordClient(length);
}

export function isAlphanumericPassword(value: string, length = 10): boolean {
  return new RegExp(`^[A-Za-z0-9]{${length}}$`).test(value);
}
