"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  employeeLoginAction,
  type EmployeeAuthState,
} from "@/lib/actions/employee-app";
import { getDeviceLabel, getOrCreateDeviceId } from "@/lib/device-id";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: EmployeeAuthState = {};

export function EmployeeLoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(employeeLoginAction, initial);
  const searchParams = useSearchParams();
  const employeeOnly = searchParams.get("error") === "employee_only";
  const [deviceId, setDeviceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
    setDeviceLabel(getDeviceLabel());
  }, []);

  useEffect(() => {
    if (state.success) {
      router.replace("/employee");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="deviceId" value={deviceId} />
      <input type="hidden" name="deviceLabel" value={deviceLabel} />
      {(state.error || employeeOnly) && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error || "ئەم بەشە تەنها بۆ کارمەندانە."}
        </div>
      )}
      <p className="text-xs text-ink-muted">
        تەنها لە یەک مۆبایل دەتوانیت بچیتە ژوورەوە. گەر مۆبایل بگۆڕیت، ئەدمین
        دەبێت پەسەندی بکات.
      </p>
      <div>
        <Label htmlFor="employeeId">ئایدی کارمەند (١٠ ژمارە)</Label>
        <Input
          id="employeeId"
          name="employeeId"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={64}
          required
          dir="ltr"
          className="text-left tracking-wider"
          placeholder="##########"
          autoComplete="username"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password">{ckb.password}</Label>
          <Link
            href="/employee/forgot-password"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {ckb.forgotPassword}
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          dir="ltr"
          className="text-left tracking-wider"
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !deviceId}>
        {pending ? ckb.loading : ckb.login}
      </Button>
    </form>
  );
}
