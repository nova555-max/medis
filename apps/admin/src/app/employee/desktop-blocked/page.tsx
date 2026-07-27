import Link from "next/link";
import { EmployeeAppDownloadLinks } from "@/components/employee-app/app-download-links";
import { ckb } from "@/lib/ckb";

export default function EmployeeDesktopBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
          م
        </div>
        <h1 className="text-2xl font-bold text-ink">{ckb.appName}</h1>
        <p className="text-ink-muted">{ckb.desktopBlocked}</p>
        <p className="text-sm text-ink-muted">{ckb.employeeOnlyMobile}</p>

        <div className="panel space-y-4 p-5 text-right">
          <EmployeeAppDownloadLinks />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/login"
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink"
          >
            چوونەژوورەوەی ئەدمین (کۆمپیوتەر)
          </Link>
        </div>
      </div>
    </main>
  );
}
