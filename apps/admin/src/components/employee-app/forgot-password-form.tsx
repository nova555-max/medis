"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  employeeRequestPasswordResetAction,
  type EmpPwdState,
} from "@/lib/actions/employee-password-reset";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: EmpPwdState = {};

export function EmployeeForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    employeeRequestPasswordResetAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-ink-muted">
        ئایدییەکەت بنووسە. داواکاری دەچێت بۆ ئەدمین و ئەو وشەی نهێنی نوێت پێ دەدات.
      </p>
      <div>
        <Label htmlFor="employeeId">ئایدی کارمەند (١٠ ژمارە)</Label>
        <Input
          id="employeeId"
          name="employeeId"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          required
          dir="ltr"
          className="text-left tracking-wider"
          placeholder="##########"
        />
      </div>
      {state.error && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {state.success}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? ckb.loading : "ناردنی داواکاری بۆ ئەدمین"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        <Link href="/employee/login" className="font-medium text-brand-600 hover:underline">
          گەڕانەوە بۆ چوونەژوورەوە
        </Link>
      </p>
    </form>
  );
}
