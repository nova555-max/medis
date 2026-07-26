"use client";

import { DeletePayrollItemButton } from "@/components/payroll/delete-payroll-item-button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

export type PayrollItemRow = {
  id: string;
  title: string;
  amount: number;
  reward_date: string;
  note: string | null;
  currency: string;
  kind: string;
  voided_at: string | null;
  employee_name: string;
  employee_code: string;
};

function fineTypeLabel(note: string | null, kind: string) {
  if (kind !== "fine") return "پاداشت";
  if (note === "auto_late_fine") return "دواکەوتن";
  if (note === "auto_absence_fine") return "غائیب";
  if (note?.startsWith("advance:")) return "پێشەکی";
  return "دەستی";
}

function noteHint(note: string | null) {
  if (!note) return null;
  if (note === "auto_late_fine") return "غەرامەی خۆکاری دواکەوتن";
  if (note === "auto_absence_fine") return "غەرامەی خۆکاری غائیب";
  if (note.startsWith("advance:")) return "قیستی پێشەکی مووچە";
  return `هۆکار: ${note}`;
}

export function PayrollItemsBoard({ items }: { items: PayrollItemRow[] }) {
  if (items.length === 0) {
    return (
      <div className="panel p-6 text-sm text-ink-muted">هیچ تۆمارێک نییە</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        دەتوانیت هەموو جۆرە غەرامەیەک هەڵبوەشێنیتەوە (دەستی، دواکەوتن، غائیب،
        پێشەکی) — لە مووچە لادەبرێت و دووبارە دروست نابێتەوە.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((r) => {
          const isFine = r.kind === "fine";
          const voided = Boolean(r.voided_at);
          const typeLabel = fineTypeLabel(r.note, r.kind);
          const hint = noteHint(r.note);
          return (
            <div
              key={r.id}
              className={cn(
                "panel p-4",
                voided && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", voided && "line-through")}>
                    {r.title}
                    <span
                      className={cn(
                        "mr-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        isFine
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {isFine ? "غەرامە" : "پاداشت"}
                    </span>
                    <span className="mr-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      {typeLabel}
                    </span>
                  </p>
                  <p className="text-xs text-ink-muted">
                    {r.employee_name} · {r.reward_date}
                    {r.employee_code ? (
                      <span dir="ltr"> · {r.employee_code}</span>
                    ) : null}
                  </p>
                  {hint ? (
                    <p className="mt-1 text-xs text-ink-muted">{hint}</p>
                  ) : null}
                </div>
                <div className="text-left">
                  <p
                    className={cn(
                      "text-lg font-bold",
                      isFine ? "text-red-600" : "text-brand-700",
                      voided && "line-through",
                    )}
                    dir="ltr"
                  >
                    {isFine ? "−" : "+"}
                    {formatMoney(r.amount, r.currency)}
                  </p>
                  <DeletePayrollItemButton
                    itemId={r.id}
                    kind={isFine ? "fine" : "reward"}
                    voided={voided}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
