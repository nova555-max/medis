import { Smartphone } from "lucide-react";
import { getEmployeeAppLinks } from "@/lib/employee-app-links";

export function EmployeeAppDownloadLinks({
  compact = false,
}: {
  compact?: boolean;
}) {
  const links = getEmployeeAppLinks();

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact ? (
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-ink">
          <Smartphone className="h-4 w-4 text-brand-700" />
          داگرتنی ئەپی کارمەند
        </div>
      ) : null}

      <div className="grid gap-2">
        {links.androidApk ? (
          <a
            href={links.androidApk}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white"
          >
            Android — داگرتنی APK
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-3 py-2 text-center text-xs text-ink-muted">
            لینکی Android APK هێشتا دانەنراوە
            <span className="mt-1 block" dir="ltr">
              NEXT_PUBLIC_EMPLOYEE_ANDROID_APK_URL
            </span>
          </div>
        )}

        {links.iosStore ? (
          <a
            href={links.iosStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            iPhone — App Store / TestFlight
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-3 py-2 text-center text-xs text-ink-muted">
            لینکی iPhone هێشتا دانەنراوە
            <span className="mt-1 block" dir="ltr">
              NEXT_PUBLIC_EMPLOYEE_IOS_URL
            </span>
          </div>
        )}

        {links.expoProject ? (
          <a
            href={links.expoProject}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm font-medium"
          >
            تاقیکردنەوە بە Expo Go
          </a>
        ) : null}

        <a
          href={links.webPortal}
          className="inline-flex items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800"
        >
          کردنەوە لە وێب — تەنها مۆبایل
        </a>
      </div>

      {!compact ? (
        <p className="text-center text-[11px] text-ink-muted">
          تەنها بۆ کارمەندە — ئەدمین لە کۆمپیوتەرەوە `/login` بەکاردەهێنێت
        </p>
      ) : null}
    </div>
  );
}
