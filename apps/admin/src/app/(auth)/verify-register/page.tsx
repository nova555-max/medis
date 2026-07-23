"use client";

import { useEffect } from "react";

/**
 * Legacy OTP verification URL. Hard-navigate to /register so old bookmarks
 * and cached links never load the removed OTP client bundle.
 */
export default function VerifyRegisterPage() {
  useEffect(() => {
    window.location.replace("/register");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-ink-muted">گواستنەوە بۆ تۆمارکردن...</p>
    </main>
  );
}
