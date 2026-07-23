/**
 * Helpers for Supabase Storage public / signed image URLs.
 */

export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.hostname.endsWith(".supabase.co") &&
      u.pathname.includes("/storage/v1/object/")
    );
  } catch {
    return false;
  }
}

/** True when URL points at a private storage object (not /public/). */
export function isPrivateStorageUrl(url: string | null | undefined): boolean {
  if (!isSupabaseStorageUrl(url)) return false;
  return !url!.includes("/storage/v1/object/public/");
}

/**
 * Prefer a usable browser src. Private storage paths need a signed URL
 * from the server — callers should pass signed URLs already.
 */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
