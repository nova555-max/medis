/** Shared env helpers for Supabase keys (server + diagnostics). */

export function sanitizeEnvValue(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\r?\n/g, "");
}

export type SupabaseKeyMeta = {
  present: boolean;
  jwt: boolean;
  len: number;
  role: string | null;
  ref: string | null;
};

export function inspectJwtKey(raw: string | undefined | null): SupabaseKeyMeta {
  const key = sanitizeEnvValue(raw);
  if (!key) return { present: false, jwt: false, len: 0, role: null, ref: null };
  const parts = key.split(".");
  if (parts.length !== 3) {
    return { present: true, jwt: false, len: key.length, role: null, ref: null };
  }
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    const payload = JSON.parse(json) as { role?: string; ref?: string };
    return {
      present: true,
      jwt: true,
      len: key.length,
      role: payload.role || null,
      ref: payload.ref || null,
    };
  } catch {
    return { present: true, jwt: false, len: key.length, role: null, ref: null };
  }
}

export function supabaseProjectRefFromUrl(url: string | undefined | null): string | null {
  const host = sanitizeEnvValue(url).replace(/^https?:\/\//, "").split("/")[0];
  if (!host) return null;
  return host.split(".")[0] || null;
}

export function getPublicSupabaseEnv() {
  const url = sanitizeEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  );
  // Browser + server must use the anon/public key — never service_role.
  const anonKey = sanitizeEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return { url, anonKey, ok: Boolean(url && anonKey) };
}

export function getServiceRoleKey() {
  return sanitizeEnvValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SERVICE_ROLE_KEY,
  );
}

export function assertAnonKey(url: string, anonKey: string): string | null {
  const ref = supabaseProjectRefFromUrl(url);
  const meta = inspectJwtKey(anonKey);
  if (!meta.present) return "NEXT_PUBLIC_SUPABASE_ANON_KEY missing";
  if (meta.jwt && meta.role && meta.role !== "anon") {
    return `NEXT_PUBLIC_SUPABASE_ANON_KEY has role "${meta.role}" (expected anon)`;
  }
  if (meta.jwt && ref && meta.ref && meta.ref !== ref) {
    return `Anon key project ref (${meta.ref}) does not match URL (${ref})`;
  }
  return null;
}

export function assertServiceRoleKey(url: string, serviceKey: string): string | null {
  const ref = supabaseProjectRefFromUrl(url);
  const meta = inspectJwtKey(serviceKey);
  if (!meta.present) return "SUPABASE_SERVICE_ROLE_KEY missing";
  if (meta.jwt && meta.role && meta.role !== "service_role") {
    return `SUPABASE_SERVICE_ROLE_KEY has role "${meta.role}" (expected service_role)`;
  }
  if (meta.jwt && ref && meta.ref && meta.ref !== ref) {
    return `Service key project ref (${meta.ref}) does not match URL (${ref})`;
  }
  return null;
}
