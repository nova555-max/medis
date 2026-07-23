"use client";

import { useActionState } from "react";
import {
  updateEmployeeSalaryAction,
  type ActionResult,
} from "@/lib/actions/employee-salary";
import { Button } from "@/components/ui/button";

const initial: ActionResult = {};

export function EmployeeInlineSalary({
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
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input
        name="baseSalary"
        type="number"
        min={0}
        step="0.01"
        defaultValue={baseSalary || 0}
        required
        dir="ltr"
        className="w-28 rounded-lg border border-line bg-surface-elevated px-2 py-1.5 text-left text-sm tabular-nums"
        aria-label="مووچە"
      />
      <select
        name="currency"
        defaultValue={currency || "IQD"}
        className="rounded-lg border border-line bg-surface-elevated px-2 py-1.5 text-sm"
        aria-label="دراو"
      >
        <option value="IQD">دینار</option>
        <option value="USD">دۆلار</option>
      </select>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="px-2.5 py-1.5 text-xs"
      >
        {pending ? "..." : "پاشەکەوت"}
      </Button>
      {state.error && (
        <span className="w-full text-[11px] text-red-600">{state.error}</span>
      )}
      {state.success && (
        <span className="w-full text-[11px] text-brand-700">✓</span>
      )}
    </form>
  );
}
