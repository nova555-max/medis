"use client";

import { useActionState, useState } from "react";
import { upsertSalaryAction, type ActionResult } from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";

const initial: ActionResult = {};

type Emp = {
  id: string;
  full_name: string;
  employee_code: string;
  base_salary?: number | null;
  currency?: string | null;
};

export function SalaryForm({ employees }: { employees: Emp[] }) {
  const [state, formAction, pending] = useActionState(upsertSalaryAction, initial);
  const now = new Date();
  const [base, setBase] = useState("0");
  const [currency, setCurrency] = useState("IQD");

  function onEmployeeChange(employeeId: string) {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    setBase(String(Number(emp.base_salary || 0)));
    setCurrency(emp.currency === "USD" ? "USD" : "IQD");
  }

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <h2 className="text-lg font-semibold">تۆمارکردنی مووچە</h2>
      <p className="text-sm text-ink-muted">
        کاتێک دۆخ بکرێتە «گەیشتووە»، ئاگاداری بۆ کارمەند دەنێردرێت — دینار یان دۆلار
      </p>

      <div>
        <Label htmlFor="employeeId">کارمەند</Label>
        <select
          id="employeeId"
          name="employeeId"
          required
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          onChange={(e) => onEmployeeChange(e.target.value)}
        >
          <option value="">هەڵبژێرە</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} ({e.employee_code}) ·{" "}
              {e.currency === "USD" ? "USD" : "IQD"}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="year">ساڵ</Label>
          <Input
            id="year"
            name="year"
            type="number"
            required
            defaultValue={now.getFullYear()}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="month">مانگ</Label>
          <Input
            id="month"
            name="month"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={now.getMonth() + 1}
            dir="ltr"
            className="text-left"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="base">بنەڕەت</Label>
          <Input
            id="base"
            name="base"
            type="number"
            min={0}
            step="0.01"
            required
            value={base}
            onChange={(e) => setBase(e.target.value)}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="currency">دراو</Label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            <option value="IQD">{currencyLabel("IQD")}</option>
            <option value="USD">{currencyLabel("USD")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="overtime">کاتی زیادە</Label>
          <Input
            id="overtime"
            name="overtime"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="bonus">بۆنس</Label>
          <Input
            id="bonus"
            name="bonus"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="allowances">زیادکراوی تر</Label>
          <Input
            id="allowances"
            name="allowances"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="deductions">کەمکردنەوە</Label>
          <Input
            id="deductions"
            name="deductions"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="paymentMethod">شێوازی پارەدان</Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue="cash"
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            <option value="cash">کاش</option>
            <option value="bank">بانک</option>
            <option value="transfer">گواستنەوە</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="status">دۆخ</Label>
        <select
          id="status"
          name="status"
          defaultValue="draft"
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          <option value="draft">ڕەشنووس</option>
          <option value="approved">پەسەندکراو</option>
          <option value="paid">گەیشتووە (ئاگاداری)</option>
        </select>
      </div>

      <div>
        <Label htmlFor="note">تێبینی</Label>
        <Input id="note" name="note" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : "پاشەکەوتکردنی مووچە"}
      </Button>
    </form>
  );
}
