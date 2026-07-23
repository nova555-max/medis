"use client";

import { useActionState } from "react";
import {
  assignEmployeeOrgAction,
  type ActionResult,
} from "@/lib/actions/org-phase2";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function EmployeeOrgAssign({
  employeeId,
  shiftId,
  shifts,
}: {
  employeeId: string;
  shiftId: string | null;
  shifts: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    assignEmployeeOrgAction,
    initial,
  );

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="branchId" value="" />
      <div>
        <h2 className="text-lg font-semibold">شفتی دەوام</h2>
        <p className="mt-1 text-sm text-ink-muted">
          دیاریکردنی کاتی دەوامی کارمەند
        </p>
      </div>
      <div>
        <Label htmlFor="shiftId">{ckb.shifts}</Label>
        <select
          id="shiftId"
          name="shiftId"
          defaultValue={shiftId || ""}
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          <option value="">کاتی گشتی کۆمپانیا</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.save}
      </Button>
    </form>
  );
}
