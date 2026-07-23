"use client";

import { useActionState } from "react";
import { employeeLeaveAction, type EmployeeAuthState } from "@/lib/actions/employee-app";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: EmployeeAuthState = {};

export function EmployeeLeaveForm({
  types,
}: {
  types: { id: string; name_ckb: string }[];
}) {
  const [state, formAction, pending] = useActionState(employeeLeaveAction, initial);

  return (
    <form action={formAction} className="panel space-y-3 p-5">
      <h2 className="text-lg font-semibold">داواکاری مۆڵەتی نوێ</h2>
      <div>
        <Label htmlFor="leaveTypeId">جۆر</Label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          required
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name_ckb}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="startDate">لە</Label>
        <Input id="startDate" name="startDate" type="date" required dir="ltr" className="text-left" />
      </div>
      <div>
        <Label htmlFor="endDate">تا</Label>
        <Input id="endDate" name="endDate" type="date" required dir="ltr" className="text-left" />
      </div>
      <div>
        <Label htmlFor="reason">هۆکار</Label>
        <Input id="reason" name="reason" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? ckb.loading : "ناردن بۆ ئەدمین"}
      </Button>
    </form>
  );
}
