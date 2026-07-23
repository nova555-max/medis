"use client";

import { useActionState } from "react";
import {
  adminCompleteEmployeePasswordResetAction,
  type EmpPwdState,
} from "@/lib/actions/employee-password-reset";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { generateAlphanumericPasswordClient } from "@/lib/employee-auth-id";
import { useState } from "react";

const initial: EmpPwdState = {};

export function ResolvePasswordRequestForm({
  requestId,
  employeeLabel,
}: {
  requestId: string;
  employeeLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    adminCompleteEmployeePasswordResetAction,
    initial,
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="mt-3 space-y-3 border-t border-line pt-3">
      <input type="hidden" name="requestId" value={requestId} />
      <p className="text-sm font-medium">{employeeLabel}</p>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor={`pwd-${requestId}`}>وشەی نهێنی نوێ</Label>
          <Input
            id={`pwd-${requestId}`}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className="text-left tracking-wider"
            placeholder="بەتاڵ = خۆکار دروست دەبێت"
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPassword(generateAlphanumericPasswordClient(10))}
          >
            دروستکردن
          </Button>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p>{state.success}</p>
          {state.password && (
            <p className="mt-2 font-mono text-base tracking-wider" dir="ltr">
              {state.password}
            </p>
          )}
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "..." : "دانانی وشەی نهێنی و ناردنی ئاگاداری"}
      </Button>
    </form>
  );
}
