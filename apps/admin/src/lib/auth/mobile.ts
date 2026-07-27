/** Shared mobile UA check for employee portal (middleware + server actions). */
export function isMobileUserAgent(ua: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS|SamsungBrowser|HarmonyOS|Huawei|Silk|Kindle|tablet/i.test(
    ua,
  );
}

type HeaderGetter = { get(name: string): string | null };

/** True when employee portal may run (mobile UA, client hint, or local override). */
export function isEmployeePortalAllowed(
  ua: string,
  headerStore?: HeaderGetter | null,
) {
  if (process.env.ALLOW_EMPLOYEE_DESKTOP === "1") return true;
  if (isMobileUserAgent(ua)) return true;
  // iPad/Android "Desktop site" often drops Mobile from UA — trust client hint
  const chMobile = headerStore?.get("sec-ch-ua-mobile");
  if (chMobile === "?1") return true;
  return false;
}
