import { fmtMoney } from "@/lib/reports/types";
import { SafeImage } from "@/components/ui/safe-image";

const MONTH_CKB = [
  "",
  "کانوونی دووەم",
  "شوبات",
  "ئازار",
  "نیسان",
  "ئایار",
  "حوزەیران",
  "تەممووز",
  "ئاب",
  "ئەیلوول",
  "تشرینی یەکەم",
  "تشرینی دووەم",
  "کانوونی یەکەم",
];

export type ReceiptData = {
  receiptNo: string;
  reportDate: string;
  month: number;
  year: number;
  paidAt: string | null;
  paymentMethod: string;
  base: number;
  overtime: number;
  bonus: number;
  deductions: number;
  net: number;
  currency?: string;
  qrDataUrl: string;
  fineItems?: { title: string; reason: string; amount: number }[];
  rewardItems?: { title: string; reason: string; amount: number }[];
  company: {
    name: string;
    logo_url: string | null;
  };
  employee: {
    full_name: string;
    employee_code: string;
    photo_url?: string | null;
    department?: string | null;
    position?: string | null;
  };
};

function money(n: number, currency?: string) {
  const cur = currency === "USD" ? "USD" : "IQD";
  const v = fmtMoney(n);
  return cur === "USD" ? `$${v}` : `${v} دینار`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

/** One employee salary stub (half A4) */
export function SalaryReceiptCard({ data }: { data: ReceiptData }) {
  const paymentLabels: Record<string, string> = {
    cash: "کاش",
    bank: "بانک",
    transfer: "گواستنەوە",
  };
  const monthLabel = `${MONTH_CKB[data.month] || data.month} ${data.year}`;
  const paidDate = data.paidAt
    ? formatDate(data.paidAt)
    : formatDate(data.reportDate);

  return (
    <section className="salary-receipt-half flex h-full flex-col overflow-hidden border border-line bg-white print:rounded-none dark:bg-surface-elevated">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-center gap-3">
          {data.company.logo_url ? (
            <SafeImage
              src={data.company.logo_url}
              alt=""
              className="h-11 w-11 rounded-lg border border-line object-contain p-0.5"
              fallback={
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white">
                  {data.company.name.slice(0, 1)}
                </div>
              }
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white">
              {data.company.name.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-sm font-bold leading-tight text-ink">
              {data.company.name}
            </p>
            <p className="text-[11px] text-ink-muted">وەسڵی مووچە — کارمەند</p>
          </div>
        </div>
        <div className="shrink-0 rounded-md bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-ink">
          {monthLabel}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <InfoBox label="ڕێکەوت" value={paidDate} ltr />
          <InfoBox label="مووچەی مانگی" value={monthLabel} />
          <InfoBox label="ژمارەی وەسڵ" value={data.receiptNo} ltr />
          <InfoBox
            label="شێوازی پارەدان"
            value={
              paymentLabels[data.paymentMethod] ||
              data.paymentMethod ||
              "کاش"
            }
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line/80 bg-surface-muted/40 px-3 py-2.5">
          {data.employee.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.employee.photo_url}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-800">
              {data.employee.full_name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{data.employee.full_name}</p>
            <p className="truncate text-[11px] text-ink-muted">
              <span dir="ltr">{data.employee.employee_code}</span>
              {data.employee.department ? ` · ${data.employee.department}` : ""}
              {data.employee.position ? ` · ${data.employee.position}` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <Row label="مووچەی بنەڕەتی" value={money(data.base, data.currency)} />
          {data.overtime > 0 && (
            <Row
              label="کاتی زیادە"
              value={money(data.overtime, data.currency)}
            />
          )}
          {data.bonus > 0 && (
            <Row
              label="پاداشت"
              value={money(data.bonus, data.currency)}
              positive
            />
          )}
          {(data.rewardItems?.length || 0) > 0 &&
            data.rewardItems!.map((item, i) => (
              <Row
                key={`r-${i}`}
                label={`· ${item.reason}`}
                value={money(item.amount, data.currency)}
                positive
              />
            ))}
          {data.deductions > 0 && (
            <Row
              label="غەرامە / لێبڕین"
              value={money(data.deductions, data.currency)}
              negative
            />
          )}
          {(data.fineItems?.length || 0) > 0 &&
            data.fineItems!.map((item, i) => (
              <Row
                key={`f-${i}`}
                label={`· هۆکار: ${item.reason}`}
                value={money(item.amount, data.currency)}
                negative
              />
            ))}
          <div className="mt-1 flex items-center justify-between rounded-lg bg-brand-600 px-3.5 py-2.5 text-white">
            <span className="text-sm font-semibold">مووچەی خاوێن</span>
            <span className="text-base font-bold" dir="ltr">
              {money(data.net, data.currency)}
            </span>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-4 border-t border-dashed border-line pt-3">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qrDataUrl} alt="QR" className="mx-auto h-16 w-16" />
            <p className="mt-0.5 text-[10px] text-ink-muted">پشتڕاستکردنەوە</p>
          </div>
          <div className="flex flex-col justify-end text-center">
            <div className="mb-1.5 h-8 border-b border-dashed border-line" />
            <p className="text-[11px] font-medium text-ink-muted">
              واژووی کارمەند
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One A4: up to 2 employee receipts (paper-saving) */
export function SalaryReceiptA4Page({
  items,
}: {
  items: [ReceiptData] | [ReceiptData, ReceiptData];
}) {
  const first = items[0];
  const second = items[1];

  return (
    <div className="salary-receipt-a4 mx-auto bg-white shadow-sm print:shadow-none dark:bg-surface-elevated">
      <div className="salary-receipt-a4-half">
        <SalaryReceiptCard data={first} />
      </div>

      <div className="salary-receipt-cut" aria-hidden>
        <span className="salary-receipt-cut-label">بڕین لێرە · دوو کارمەند / A4</span>
      </div>

      <div className="salary-receipt-a4-half">
        {second ? (
          <SalaryReceiptCard data={second} />
        ) : (
          <div className="flex h-full items-center justify-center border border-dashed border-line/50 bg-surface-muted/20 text-sm text-ink-muted print:border-0 print:bg-transparent print:text-transparent">
            بەتاڵ
          </div>
        )}
      </div>
    </div>
  );
}

/** Chunk all receipts into A4 pages of 2 employees each */
export function SalaryReceiptBatch({ items }: { items: ReceiptData[] }) {
  const pages: Array<[ReceiptData] | [ReceiptData, ReceiptData]> = [];
  for (let i = 0; i < items.length; i += 2) {
    const a = items[i];
    const b = items[i + 1];
    if (b) pages.push([a, b]);
    else pages.push([a]);
  }

  return (
    <div className="salary-receipt-batch space-y-6 print:space-y-0">
      {pages.map((page, idx) => (
        <div key={idx} className="salary-receipt-print-page">
          <SalaryReceiptA4Page items={page} />
        </div>
      ))}
    </div>
  );
}

/** @deprecated use SalaryReceiptA4Page */
export function SalaryReceiptA4({
  shared,
}: {
  shared: ReceiptData;
}) {
  return <SalaryReceiptA4Page items={[shared]} />;
}

function InfoBox({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line/70 bg-surface-muted/30 px-2.5 py-2">
      <p className="text-[10px] text-ink-muted">{label}</p>
      <p
        className="mt-0.5 truncate text-xs font-semibold text-ink"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-ink-muted">{label}</span>
      <span
        className={
          positive
            ? "font-semibold text-emerald-700"
            : negative
              ? "font-semibold text-red-600"
              : "font-semibold text-ink"
        }
        dir="ltr"
      >
        {value}
      </span>
    </div>
  );
}
