"use client";

import { usePathname } from "next/navigation";
import { EmployeeBottomNav } from "@/components/employee-app/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ckb } from "@/lib/ckb";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/employee/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-surface-elevated/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-tight text-brand-800 dark:text-brand-200">
              {ckb.appName}
            </p>
            <p className="text-xs text-ink-muted">ئەپی کارمەندان</p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-5 animate-[fadeIn_0.45s_ease-out]">
        {children}
      </div>
      <EmployeeBottomNav />
    </div>
  );
}
