"use client";

import { useActionState } from "react";
import {
  assignEmployeeWorkHoursAction,
  type ActionResult,
} from "@/lib/actions/org-phase2";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function EmployeeOrgAssign({
  employeeId,
  workStart = "09:00",
  workEnd = "17:00",
}: {
  employeeId: string;
  workStart?: string;
  workEnd?: string;
}) {
  const [state, formAction, pending] = useActionState(
    assignEmployeeWorkHoursAction,
    initial,
  );

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <input type="hidden" name="employeeId" value={employeeId} />
      <div>
        <h2 className="text-lg font-semibold">کاتی دەوامی کارمەند</h2>
        <p className="mt-1 text-sm text-ink-muted">
          کاتی دەستپێک و کۆتایی بە شێوەی ٢٤ کاتژمێری دابنێ
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="workStart">کاتی دەستپێکی کار</Label>
          <Input
            id="workStart"
            name="workStart"
            type="time"
            step={60}
            lang="en-GB"
            defaultValue={String(workStart).slice(0, 5)}
            required
            dir="ltr"
            className="text-left tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="workEnd">کاتی کۆتایی کار</Label>
          <Input
            id="workEnd"
            name="workEnd"
            type="time"
            step={60}
            lang="en-GB"
            defaultValue={String(workEnd).slice(0, 5)}
            required
            dir="ltr"
            className="text-left tabular-nums"
          />
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
