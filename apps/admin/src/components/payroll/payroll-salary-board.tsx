"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer, Search } from "lucide-react";
import { MarkPaidButton } from "@/components/payroll/mark-paid-button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

export type PayrollSalaryRow = {
  id: string;
  year: number;
  month: number;
  base_amount: number;
  allowances: number;
  deductions: number;
  overtime_amount: number;
  bonus_amount: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
  receipt_number: string | null;
  payment_method: string | null;
  currency: string;
  employee_name: string;
  employee_code: string;
  department_name: string;
};

function statusLabel(status: string) {
  if (status === "paid") return "پارەدراو";
  if (status === "approved") return "پەسەندکراو";
  if (status === "draft") return "ڕەشنووس";
  return status;
}

function statusTone(status: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-800";
  if (status === "approved") return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-900";
}

const MONTHS = [
  { v: 0, l: "هەموو مانگەکان" },
  { v: 1, l: "١" },
  { v: 2, l: "٢" },
  { v: 3, l: "٣" },
  { v: 4, l: "٤" },
  { v: 5, l: "٥" },
  { v: 6, l: "٦" },
  { v: 7, l: "٧" },
  { v: 8, l: "٨" },
  { v: 9, l: "٩" },
  { v: 10, l: "١٠" },
  { v: 11, l: "١١" },
  { v: 12, l: "١٢" },
];

export function PayrollSalaryBoard({
  rows,
  initialYear,
  initialMonth,
}: {
  rows: PayrollSalaryRow[];
  initialYear: number;
  initialMonth: number;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const years = useMemo(() => {
    const set = new Set<number>([initialYear, new Date().getFullYear()]);
    for (const r of rows) set.add(r.year);
    return Array.from(set).sort((a, b) => b - a);
  }, [rows, initialYear]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.year !== year) return false;
      if (month > 0 && r.month !== month) return false;
      if (status && r.status !== status) return false;
      if (!needle) return true;
      return (
        r.employee_name.toLowerCase().includes(needle) ||
        r.employee_code.toLowerCase().includes(needle) ||
        r.department_name.toLowerCase().includes(needle)
      );
    });
  }, [rows, year, month, status, q]);

  const summary = useMemo(() => {
    let iqd = 0;
    let usd = 0;
    let paid = 0;
    let unpaid = 0;
    for (const r of filtered) {
      if (r.currency === "USD") usd += r.net_amount;
      else iqd += r.net_amount;
      if (r.status === "paid") paid += 1;
      else unpaid += 1;
    }
    return { count: filtered.length, iqd, usd, paid, unpaid };
  }, [filtered]);

  const exportHref = useMemo(() => {
    const p = new URLSearchParams();
    p.set("year", String(year));
    if (month > 0) p.set("month", String(month));
    if (status) p.set("status", status);
    if (q.trim()) p.set("q", q.trim());
    return `/api/payroll/export?${p.toString()}`;
  }, [year, month, status, q]);

  const receiptsHref =
    month > 0
      ? `/payroll/receipts/print?year=${year}&month=${month}`
      : `/payroll/receipts/print?year=${year}&month=${initialMonth}`;

  return (
    <section className="panel payroll-print-root overflow-hidden">
      <div className="border-b border-line bg-gradient-to-l from-brand-600/12 via-surface to-surface px-5 py-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Payroll register
            </p>
            <h2 className="mt-1 text-xl font-bold">لیستی مووچەی کارمەندان</h2>
            <p className="mt-1 text-sm text-ink-muted">
              فلتەر · ئێکسڵ · چاپ · وەسڵ
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={exportHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
            >
              <FileSpreadsheet className="h-4 w-4" />
              داگرتنی ئێکسڵ
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm font-medium transition hover:border-brand-300"
            >
              <Printer className="h-4 w-4" />
              چاپکردنی لیست
            </button>
            <Link
              href={receiptsHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              <Printer className="h-4 w-4" />
              چاپکردنی وەسڵەکان
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-line/80 bg-white/70 p-4 backdrop-blur">
            <p className="text-xs text-ink-muted">ژمارەی تۆمار</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{summary.count}</p>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white/70 p-4 backdrop-blur">
            <p className="text-xs text-ink-muted">کۆی دینار</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-brand-700" dir="ltr">
              {formatMoney(summary.iqd, "IQD")}
            </p>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white/70 p-4 backdrop-blur">
            <p className="text-xs text-ink-muted">کۆی دۆلار</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-brand-700" dir="ltr">
              {formatMoney(summary.usd, "USD")}
            </p>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white/70 p-4 backdrop-blur">
            <p className="text-xs text-ink-muted">پارەدراو / ماوە</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              <span className="text-emerald-700">{summary.paid}</span>
              <span className="mx-1 text-ink-muted">/</span>
              <span className="text-amber-700">{summary.unpaid}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-muted">ساڵ</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5"
              dir="ltr"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-muted">مانگ</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5"
            >
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.l}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-muted">دۆخ</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5"
            >
              <option value="">هەموو</option>
              <option value="draft">ڕەشنووس</option>
              <option value="approved">پەسەندکراو</option>
              <option value="paid">پارەدراو</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-muted">گەڕان</span>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ناو / کۆد / بەش"
                className="w-full rounded-xl border border-line bg-surface-elevated py-2.5 pr-10 pl-3.5"
              />
            </div>
          </label>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden border-b border-black/20 px-5 py-4 print:block">
        <h2 className="text-xl font-bold">لیستی مووچەی کارمەندان</h2>
        <p className="mt-1 text-sm" dir="ltr">
          {month > 0 ? `${month}/${year}` : `Year ${year}`}
          {status ? ` · ${statusLabel(status)}` : ""}
          {q.trim() ? ` · “${q.trim()}”` : ""}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-ink-muted">
          هیچ تۆمارێک بۆ ئەم فلتەرە نییە. مووچەی مانگ دروست بکە یان فلتەر بگۆڕە.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="payroll-list-table w-full min-w-[980px] text-sm">
            <thead className="border-b border-line bg-surface-muted/70">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">#</th>
                <th className="px-4 py-3 text-right font-semibold">کارمەند</th>
                <th className="px-4 py-3 text-right font-semibold">بەش</th>
                <th className="px-4 py-3 text-right font-semibold">مانگ</th>
                <th className="px-4 py-3 text-right font-semibold">بنەڕەت</th>
                <th className="px-4 py-3 text-right font-semibold">پاداشت</th>
                <th className="px-4 py-3 text-right font-semibold">غەرامە</th>
                <th className="px-4 py-3 text-right font-semibold">کۆی خاوێن</th>
                <th className="px-4 py-3 text-right font-semibold">دۆخ</th>
                <th className="px-4 py-3 text-left font-semibold print:hidden">
                  کردار
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const bonus = s.bonus_amount || s.allowances || 0;
                return (
                  <tr
                    key={s.id}
                    className="border-b border-line/80 transition hover:bg-brand-600/[0.03] last:border-0"
                  >
                    <td className="px-4 py-3 tabular-nums text-ink-muted">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.employee_name}</p>
                      <p className="text-xs text-ink-muted" dir="ltr">
                        {s.employee_code}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {s.department_name || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums" dir="ltr">
                      {s.month}/{s.year}
                    </td>
                    <td className="px-4 py-3 tabular-nums" dir="ltr">
                      {formatMoney(s.base_amount, s.currency)}
                    </td>
                    <td
                      className="px-4 py-3 tabular-nums text-emerald-700"
                      dir="ltr"
                    >
                      {formatMoney(bonus, s.currency)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-red-600" dir="ltr">
                      {formatMoney(s.deductions, s.currency)}
                    </td>
                    <td
                      className="px-4 py-3 font-bold tabular-nums text-brand-700"
                      dir="ltr"
                    >
                      {formatMoney(s.net_amount, s.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-lg px-2 py-1 text-[11px] font-medium",
                          statusTone(s.status),
                        )}
                      >
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.status !== "paid" && (
                          <MarkPaidButton salaryId={s.id} />
                        )}
                        <Link
                          href={`/payroll/receipt/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          وەسڵ
                        </Link>
                        <Link
                          href={`/api/payroll/receipt/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-elevated px-2.5 py-1.5 text-xs font-medium"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-line bg-surface-muted/40">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-sm font-semibold">
                  کۆی گشتی ({summary.count} کارمەند)
                </td>
                <td className="px-4 py-3 text-sm font-bold" dir="ltr">
                  <div>{formatMoney(summary.iqd, "IQD")}</div>
                  {summary.usd > 0 ? (
                    <div className="mt-0.5">{formatMoney(summary.usd, "USD")}</div>
                  ) : null}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
