/** Shared mobile UA check for employee portal (middleware + server actions). */
export function isMobileUserAgent(ua: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(
    ua,
  );
}

/** True when employee portal may run (mobile UA, or explicit local override). */
export function isEmployeePortalAllowed(ua: string) {
  if (process.env.ALLOW_EMPLOYEE_DESKTOP === "1") return true;
  return isMobileUserAgent(ua);
}
