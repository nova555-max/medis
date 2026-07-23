"use client";

import { useActionState } from "react";
import { addRewardAction, type ActionResult } from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function RewardForm({
  employees,
}: {
  employees: { id: string; full_name: string; employee_code: string }[];
}) {
  const [state, formAction, pending] = useActionState(addRewardAction, initial);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <h2 className="text-lg font-semibold">زیادکردنی پاداشت</h2>
      <p className="text-sm text-ink-muted">دوای زیادکردن، ئاگاداری بۆ کارمەند دەنێردرێت</p>

      <div>
        <Label htmlFor="rewardEmployeeId">کارمەند</Label>
        <select
          id="rewardEmployeeId"
          name="employeeId"
          required
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          <option value="">هەڵبژێرە</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} ({e.employee_code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="title">ناونیشان</Label>
        <Input id="title" name="title" required placeholder="بۆ نموونە: پاداشتی کارکردن" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">بڕ</Label>
          <Input id="amount" name="amount" type="number" min={0} step="0.01" required defaultValue={0} dir="ltr" className="text-left" />
        </div>
        <div>
          <Label htmlFor="rewardDate">بەروار</Label>
          <Input id="rewardDate" name="rewardDate" type="date" defaultValue={today} dir="ltr" className="text-left" />
        </div>
      </div>

      <div>
        <Label htmlFor="rewardNote">تێبینی</Label>
        <Input id="rewardNote" name="note" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : "زیادکردنی پاداشت"}
      </Button>
    </form>
  );
}
