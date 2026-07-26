import { AutoPayrollPanel } from "@/components/payroll/auto-payroll-panel";
import { PayrollItemForm } from "@/components/payroll/payroll-item-form";
import { AdvanceForm } from "@/components/payroll/advance-form";
import {
  PayrollItemsBoard,
  type PayrollItemRow,
} from "@/components/payroll/payroll-items-board";
import {
  PayrollSalaryBoard,
  type PayrollSalaryRow,
} from "@/components/payroll/payroll-salary-board";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function PayrollPage() {
  const supabase = await createClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [
    { data: employees },
    { data: salaries },
    rewardsRes,
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
        "id, title, amount, reward_date, note, currency, kind, voided_at, employees(full_name, employee_code)",
      )
      .order("reward_date", { ascending: false })
      .limit(80),
    supabase
      .from("salary_advances")
      .select(
        "id, amount, remaining, installment_amount, currency, note, status, created_at, employees(full_name, employee_code)",
      )
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  let rewards: Array<Record<string, unknown>> | null = rewardsRes.data as
    | Array<Record<string, unknown>>
    | null;
  let voidColumnReady = !rewardsRes.error;
  if (rewardsRes.error) {
    const fallback = await supabase
      .from("rewards")
      .select(
        "id, title, amount, reward_date, note, currency, kind, employees(full_name, employee_code)",
      )
      .order("reward_date", { ascending: false })
      .limit(80);
    rewards = (fallback.data as Array<Record<string, unknown>> | null) || null;
    voidColumnReady = false;
  }

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
      receipt_number:
        (s as { receipt_number?: string | null }).receipt_number || null,
      payment_method:
        (s as { payment_method?: string | null }).payment_method || null,
      currency: (s as { currency?: string }).currency || "IQD",
      employee_name: emp?.full_name || "—",
      employee_code: emp?.employee_code || "",
      department_name: emp?.departments?.name || "",
    };
  });

  const itemRows: PayrollItemRow[] = (rewards ?? []).map((r) => {
    const emp = r.employees as {
      full_name?: string;
      employee_code?: string;
    } | null;
    return {
      id: String(r.id),
      title: String(r.title || ""),
      amount: Number(r.amount || 0),
      reward_date: String(r.reward_date || ""),
      note: (r.note as string | null) || null,
      currency: (r.currency as string) || "IQD",
      kind: (r.kind as string) || "reward",
      voided_at: voidColumnReady
        ? ((r.voided_at as string | null) || null)
        : null,
      employee_name: emp?.full_name || "—",
      employee_code: emp?.employee_code || "",
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

      <div className="space-y-6 print:hidden">
        <AutoPayrollPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <PayrollItemForm employees={list} kind="reward" />
          <PayrollItemForm employees={list} kind="fine" />
        </div>

        <AdvanceForm employees={list} advances={advanceRows as never} />
      </div>

      <PayrollSalaryBoard
        rows={salaryRows}
        initialYear={salaryRows[0]?.year || currentYear}
        initialMonth={
          salaryRows.find((r) => r.year === (salaryRows[0]?.year || currentYear))
            ?.month || currentMonth
        }
      />

      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            پاداشت / غەرامە (هەڵوەشاندنەوە)
          </h2>
          <Link
            href="/employees"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            مووچەی بنەڕەتی کارمەندان →
          </Link>
        </div>
        {!voidColumnReady ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            بۆ هەڵوەشاندنەوەی هەمیشەیی غەرامە خۆکارەکان، فایلەکەی{" "}
            <code dir="ltr">FIX_void_all_fines.sql</code> لە Supabase SQL Editor
            جێبەجێ بکە.
          </div>
        ) : null}
        <PayrollItemsBoard items={itemRows} />
      </div>
    </div>
  );
}
