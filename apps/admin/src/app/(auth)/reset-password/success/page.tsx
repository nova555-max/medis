"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = window.setTimeout(() => router.replace("/login"), 3000);
    return () => window.clearTimeout(t);
  }, [router]);

  return (
    <AuthShell
      title="سەرکەوتوو بوو"
      subtitle="وشەی نهێنی نوێکرایەوە"
    >
      <div className="space-y-4 text-center animate-[fadeIn_0.4s_ease-out]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          ✓
        </div>
        <p className="text-sm text-ink-muted">
          ئێستا دەگەڕێیتەوە بۆ لاپەڕەی چوونەژوورەوە...
        </p>
        <Link
          href="/login"
          className="inline-flex w-full justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          چوونەژوورەوە ئێستا
        </Link>
      </div>
    </AuthShell>
  );
}
