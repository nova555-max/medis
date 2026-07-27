"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  employeeLoginAction,
  type EmployeeAuthState,
} from "@/lib/actions/employee-app";
import { getDeviceLabel, getOrCreateDeviceId } from "@/lib/device-id";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: EmployeeAuthState = {};

function readDeviceFields() {
  if (typeof window === "undefined") {
    return { deviceId: "", deviceLabel: "مۆبایل" };
  }
  return {
    deviceId: getOrCreateDeviceId(),
    deviceLabel: getDeviceLabel(),
  };
}

export function EmployeeLoginForm() {
  const [state, formAction, pending] = useActionState(
    employeeLoginAction,
    initial,
  );
  const searchParams = useSearchParams();
  const errParam = searchParams.get("error");
  const paramError =
    errParam === "employee_only"
      ? "ئەم بەشە تەنها بۆ کارمەندانە."
      : errParam === "blacklisted"
        ? "هەژمارەکەت ڕەشکراوە — پەیوەندی بە ئەدمین بکە."
        : errParam === "inactive"
          ? "هەژمارەکەت چالاک نییە."
          : null;
  const [deviceId, setDeviceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("مۆبایل");

  useEffect(() => {
    const d = readDeviceFields();
    setDeviceId(d.deviceId);
    setDeviceLabel(d.deviceLabel);
  }, []);

  useEffect(() => {
    if (state.success) {
      window.location.assign("/employee");
    }
  }, [state.success]);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={() => {
        // Ensure device fields exist even if first paint had empty hidden inputs
        const d = readDeviceFields();
        setDeviceId(d.deviceId);
        setDeviceLabel(d.deviceLabel);
        const idInput = document.querySelector<HTMLInputElement>(
          'input[name="deviceId"]',
        );
        const labelInput = document.querySelector<HTMLInputElement>(
          'input[name="deviceLabel"]',
        );
        if (idInput) idInput.value = d.deviceId;
        if (labelInput) labelInput.value = d.deviceLabel;
      }}
    >
      <input type="hidden" name="deviceId" value={deviceId} />
      <input type="hidden" name="deviceLabel" value={deviceLabel} />
      {(state.error || paramError) && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error || paramError}
        </div>
      )}
      <p className="text-xs text-ink-muted">
        ئەگەر مۆبایل بگۆڕیت، دەتوانیت ئاسایی بچیتە ژوورەوە — ئەدمین تەنها ئاگادار
        دەکرێتەوە.
      </p>
      <div>
        <Label htmlFor="employeeId">ئایدی کارمەند (١٠ ژمارە)</Label>
        <Input
          id="employeeId"
          name="employeeId"
          inputMode="numeric"
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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? ckb.loading : ckb.login}
      </Button>
    </form>
  );
}
