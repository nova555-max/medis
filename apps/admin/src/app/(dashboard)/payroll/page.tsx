import { AutoPayrollPanel } from "@/components/payroll/auto-payroll-panel";
import { PayrollItemForm } from "@/components/payroll/payroll-item-form";
import { MarkPaidButton } from "@/components/payroll/mark-paid-button";
import { DeletePayrollItemButton } from "@/components/payroll/delete-payroll-item-button";
import { AdvanceForm } from "@/components/payroll/advance-form";
import Link from "next/link";
import { FileText, Printer, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { formatMoney } from "@/lib/money";

function statusLabel(status: string) {
  if (status === "paid") return "پارەدراو";
  if (status === "approved") return "پەسەندکراو";
  if (status === "draft") return "ڕەشنووس";
  return status;
}

export default async function PayrollPage() {
  const supabase = await createClient();

  const [{ data: employees }, { data: salaries }, { data: rewards }, { data: advances }] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, full_name, employee_code, base_salary, currency")
        .eq("status", "active")
        .order("full_name"),
      supabase
        .from("salaries")
        .select(
          "id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, status, paid_at, receipt_number, payment_method, currency, employees(full_name, employee_code)",
        )
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(60),
      supabase
        .from("rewards")
        .select(
          "id, title, amount, reward_date, note, currency, kind, employees(full_name, employee_code)",
        )
        .order("reward_date", { ascending: false })
        .limit(40),
      supabase
        .from("salary_advances")
        .select(
          "id, amount, remaining, installment_amount, currency, note, status, created_at, employees(full_name, employee_code)",
        )
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  const list = employees ?? [];
  const salaryRows = salaries ?? [];
  const advanceRows = advances ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.payroll}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          سیستەم خۆکار: مووچە + پاداشت − غەرامە = کۆی خاوێن
        </p>
      </div>

      <AutoPayrollPanel />

      <div className="grid gap-6 lg:grid-cols-2">
        <PayrollItemForm employees={list} kind="reward" />
        <PayrollItemForm employees={list} kind="fine" />
      </div>

      <AdvanceForm employees={list} advances={advanceRows as never} />

      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">مووچە و وەسڵ</h2>
              <p className="text-sm text-ink-muted">
                ٢ کارمەند لە یەک A4 — کەمکردنەوەی کاغەز
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const now = new Date();
              const y = now.getFullYear();
              const m = now.getMonth() + 1;
              const latest = salaryRows[0];
              const py = latest?.year || y;
              const pm = latest?.month || m;
              return (
                <Link
                  href={`/payroll/receipts/print?year=${py}&month=${pm}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <Printer className="h-4 w-4" />
                  چاپکردنی هەموو وەسڵەکان ({pm}/{py})
                </Link>
              );
            })()}
            <Link
              href="/employees"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              مووچەی بنەڕەتی →
            </Link>
          </div>
        </div>

        {salaryRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface-muted/40 px-4 py-8 text-center text-sm text-ink-muted">
            هێشتا مووچە دروست نەبووە. سەرەتا مووچەی بنەڕەتی لە کارمەند دابنێ، پاشان
            «دروستکردنی مووچەی مانگ خۆکار» دابگرە.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-line bg-surface-muted/60">
                <tr>
                  <th className="px-3 py-3 text-right">کارمەند</th>
                  <th className="px-3 py-3 text-right">مانگ</th>
                  <th className="px-3 py-3 text-right">بنەڕەت</th>
                  <th className="px-3 py-3 text-right">پاداشت</th>
                  <th className="px-3 py-3 text-right">غەرامە</th>
                  <th className="px-3 py-3 text-right">کۆی خاوێن</th>
                  <th className="px-3 py-3 text-right">دۆخ</th>
                  <th className="px-3 py-3 text-left">کردار</th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.map((s) => {
                  const emp = s.employees as {
                    full_name?: string;
                    employee_code?: string;
                  } | null;
                  const cur = (s as { currency?: string }).currency || "IQD";
                  const bonus =
                    Number(s.bonus_amount || 0) || Number(s.allowances || 0);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">{emp?.full_name}</p>
                        <p className="text-xs text-ink-muted" dir="ltr">
                          {emp?.employee_code}
                        </p>
                      </td>
                      <td className="px-3 py-3" dir="ltr">
                        {s.month}/{s.year}
                      </td>
                      <td className="px-3 py-3" dir="ltr">
                        {formatMoney(Number(s.base_amount), cur)}
                      </td>
                      <td className="px-3 py-3 text-emerald-700" dir="ltr">
                        {formatMoney(bonus, cur)}
                      </td>
                      <td className="px-3 py-3 text-red-600" dir="ltr">
                        {formatMoney(Number(s.deductions), cur)}
                      </td>
                      <td
                        className="px-3 py-3 font-bold text-brand-700"
                        dir="ltr"
                      >
                        {formatMoney(Number(s.net_amount), cur)}
                      </td>
                      <td className="px-3 py-3">{statusLabel(s.status)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {s.status !== "paid" && (
                            <MarkPaidButton salaryId={s.id} />
                          )}
                          <Link
                            href={`/payroll/receipt/${s.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-medium text-white"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            وەسڵ
                          </Link>
                          <Link
                            href={`/api/payroll/receipt/${s.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs font-medium"
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
            </table>
          </div>
        )}
      </section>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">دوایین پاداشت / غەرامە</h2>
        {(rewards ?? []).length === 0 ? (
          <div className="panel p-6 text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rewards!.map((r) => {
              const emp = r.employees as {
                full_name?: string;
                employee_code?: string;
              } | null;
              const isFine = (r as { kind?: string }).kind === "fine";
              return (
                <div key={r.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {r.title}
                        <span
                          className={`mr-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            isFine
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isFine ? "غەرامە" : "پاداشت"}
                        </span>
                      </p>
                      <p className="text-xs text-ink-muted">
                        {emp?.full_name} · {r.reward_date}
                      </p>
                      {(r as { note?: string | null }).note &&
                      (r as { note?: string }).note !== "auto_late_fine" ? (
                        <p className="mt-1 text-xs text-ink-muted">
                          هۆکار: {(r as { note: string }).note}
                        </p>
                      ) : (r as { note?: string | null }).note ===
                        "auto_late_fine" ? (
                        <p className="mt-1 text-xs text-amber-700">
                          هۆکار: غەرامەی خۆکاری دواکەوتن
                        </p>
                      ) : null}
                    </div>
                    <div className="text-left">
                      <p
                        className={`text-lg font-bold ${
                          isFine ? "text-red-600" : "text-brand-700"
                        }`}
                        dir="ltr"
                      >
                        {isFine ? "−" : "+"}
                        {formatMoney(
                          Number(r.amount),
                          (r as { currency?: string }).currency,
                        )}
                      </p>
                      <DeletePayrollItemButton
                        itemId={r.id}
                        kind={isFine ? "fine" : "reward"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
