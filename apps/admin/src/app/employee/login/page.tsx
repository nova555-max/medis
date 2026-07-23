import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmployeeLoginForm } from "@/components/employee-app/login-form";
import { ckb } from "@/lib/ckb";

export default function EmployeeLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
            م
          </div>
          <h1 className="text-3xl font-bold">{ckb.appName}</h1>
          <p className="mt-2 text-sm font-medium text-brand-700">
            پەڕەی کارمەند — جیا لە ئەدمین
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            چوونەژوورەوە بە ئایدی ١٠ ژمارە و وشەی نهێنی (پیت و ژمارە)
          </p>
        </div>
        <div className="panel p-6">
          <h2 className="mb-6 text-xl font-semibold">چوونەژوورەوەی کارمەند</h2>
          <Suspense fallback={<p className="text-sm text-ink-muted">{ckb.loading}</p>}>
            <EmployeeLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
