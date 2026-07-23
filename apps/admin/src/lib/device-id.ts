const STORAGE_KEY = "mo_emp_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 8) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `d-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `d-${Date.now()}`;
  }
}

export function getDeviceLabel(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "مۆبایل";
  }
  const ua = navigator.userAgent || "";
  // short readable label
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "Mac";
  return ua.slice(0, 80) || "مۆبایل";
}
