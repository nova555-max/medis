"use client";

import { useActionState } from "react";
import {
  updateEmployeeSalaryAction,
  type ActionResult,
} from "@/lib/actions/employee-salary";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";

const initial: ActionResult = {};

export function EmployeeSalaryForm({
  employeeId,
  baseSalary,
  currency,
}: {
  employeeId: string;
  baseSalary: number;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmployeeSalaryAction,
    initial,
  );

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <input type="hidden" name="employeeId" value={employeeId} />
      <div>
        <h2 className="text-lg font-semibold">مووچەی کارمەند</h2>
        <p className="mt-1 text-sm text-ink-muted">
          تەنها ئەم بڕە دابنێ — سیستەم خۆی مووچەی مانگ، پاداشت، غەرامە و کۆی خاوێن
          حیساب دەکات (دینار یان دۆلار)
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="baseSalary">مووچەی بنەڕەتی</Label>
          <Input
            id="baseSalary"
            name="baseSalary"
            type="number"
            min={0}
            step="0.01"
            defaultValue={baseSalary}
            required
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="currency">دراو</Label>
          <select
            id="currency"
            name="currency"
            defaultValue={currency || "IQD"}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            <option value="IQD">{currencyLabel("IQD")}</option>
            <option value="USD">{currencyLabel("USD")}</option>
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.save}
      </Button>
    </form>
  );
}
