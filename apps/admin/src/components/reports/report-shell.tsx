import type { CompanyBrand, ReportMeta } from "@/lib/reports/types";
import { PrintReportButton } from "@/components/reports/print-button";
import { SafeImage } from "@/components/ui/safe-image";
import { safeImageSrc } from "@/lib/storage/image-url";

export function ReportShell({
  brand,
  meta,
  children,
  actions,
}: {
  brand: CompanyBrand;
  meta: ReportMeta;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const logoSrc = safeImageSrc(brand.logo_url);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-ink-muted" dir="ltr">
            {meta.reportNumber} · {meta.reportDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          <PrintReportButton />
        </div>
      </div>

      <article className="report-sheet panel overflow-hidden print:shadow-none print:border-0">
        <header className="report-header flex flex-wrap items-start gap-4 bg-brand-600 px-6 py-5 text-white">
          <SafeImage
            src={logoSrc}
            alt={brand.name}
            className="h-14 w-14 rounded-xl bg-white object-contain p-1"
            fallback={
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">
                م
              </div>
            }
          />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold">{brand.name}</p>
            <p className="mt-1 text-sm text-white/85">
              {[brand.address, brand.phone, brand.email]
                .filter(Boolean)
                .join(" · ") || "زانیاری پەیوەندی لە ڕێکخستن زیاد بکە"}
            </p>
          </div>
          <div className="text-sm text-white/90" dir="ltr">
            <p>{meta.reportNumber}</p>
            <p>{meta.reportDate}</p>
          </div>
        </header>

        <div className="border-b border-line px-6 py-4 text-sm text-ink-muted">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>دروستکراو لەلایەن: {meta.generatedBy}</span>
            <span dir="ltr">کات: {meta.generatedAt}</span>
            {meta.from && meta.to && (
              <span dir="ltr">
                ماوە: {meta.from} → {meta.to}
              </span>
            )}
          </div>
          {brand.report_watermark && (
            <p className="mt-2 text-xs opacity-60">
              واتەرمارک: {brand.report_watermark}
            </p>
          )}
        </div>

        <div className="report-body px-6 py-5">{children}</div>

        <footer className="report-footer flex items-center justify-between border-t border-line px-6 py-3 text-xs text-ink-muted">
          <span>{brand.name}</span>
          <span className="print-page-num">A4 · RTL</span>
        </footer>
      </article>
    </div>
  );
}
