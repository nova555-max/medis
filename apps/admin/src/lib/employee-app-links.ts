/** Public download / store links for the employee mobile app only. */
export function getEmployeeAppLinks() {
  const androidApk =
    process.env.NEXT_PUBLIC_EMPLOYEE_ANDROID_APK_URL?.trim() || "";
  const iosStore =
    process.env.NEXT_PUBLIC_EMPLOYEE_IOS_URL?.trim() || "";
  /** Optional Expo project page / QR for testers */
  const expoProject =
    process.env.NEXT_PUBLIC_EMPLOYEE_EXPO_URL?.trim() || "";
  /** Web employee portal (already works on phone browser) */
  const webPortal = "/employee/login";

  return {
    androidApk,
    iosStore,
    expoProject,
    webPortal,
    hasNativeLinks: Boolean(androidApk || iosStore || expoProject),
  };
}
