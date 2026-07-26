import { AutoPayrollPanel } from "@/components/payroll/auto-payroll-panel";
import { PayrollItemForm } from "@/components/payroll/payroll-item-form";
import { AdvanceForm } from "@/components/payroll/advance-form";
import { DeletePayrollItemButton } from "@/components/payroll/delete-payroll-item-button";
import {
  PayrollSalaryBoard,
  type PayrollSalaryRow,
} from "@/components/payroll/payroll-salary-board";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { formatMoney } from "@/lib/money";

export default async function PayrollPage() {
  const supabase = await createClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [
    { data: employees },
    { data: salaries },
    { data: rewards },
    { data: advances },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, employee_code, base_salary, currency")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("salaries")
      .select(
        "id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, status, paid_at, receipt_number, payment_method, currency, employees(full_name, employee_code, departments(name))",
      )
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(800),
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
  const advanceRows = advances ?? [];

  const salaryRows: PayrollSalaryRow[] = (salaries ?? []).map((s) => {
    const emp = s.employees as {
      full_name?: string;
      employee_code?: string;
      departments?: { name?: string } | null;
    } | null;
    return {
      id: s.id,
      year: s.year,
      month: s.month,
      base_amount: Number(s.base_amount || 0),
      allowances: Number(s.allowances || 0),
      deductions: Number(s.deductions || 0),
      overtime_amount: Number(s.overtime_amount || 0),
      bonus_amount: Number(s.bonus_amount || 0),
      net_amount: Number(s.net_amount || 0),
      status: s.status,
      paid_at: s.paid_at,
      receipt_number: (s as { receipt_number?: string | null }).receipt_number || null,
      payment_method: (s as { payment_method?: string | null }).payment_method || null,
      currency: (s as { currency?: string }).currency || "IQD",
      employee_name: emp?.full_name || "—",
      employee_code: emp?.employee_code || "",
      department_name: emp?.departments?.name || "",
    };
  });

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.payroll}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          سیستەم خۆکار: مووچە + پاداشت − غەرامە = کۆی خاوێن · ئێکسڵ و چاپ
        </p>
      </div>

      <div className="print:hidden space-y-6">
        <AutoPayrollPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <PayrollItemForm employees={list} kind="reward" />
          <PayrollItemForm employees={list} kind="fine" />
        </div>

        <AdvanceForm employees={list} advances={advanceRows as never} />
      </div>

      <PayrollSalaryBoard
        rows={salaryRows}
        initialYear={
          salaryRows[0]?.year || currentYear
        }
        initialMonth={
          salaryRows.find((r) => r.year === (salaryRows[0]?.year || currentYear))
            ?.month || currentMonth
        }
      />

      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">دوایین پاداشت / غەرامە</h2>
          <Link
            href="/employees"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            مووچەی بنەڕەتی کارمەندان →
          </Link>
        </div>
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
