"use client";

import { useActionState } from "react";
import {
  approveEmployeeDeviceAction,
  clearEmployeeDeviceAction,
  updateEmployeeProfileAction,
  type ActionResult,
} from "@/lib/actions/employee-admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";

const initial: ActionResult = {};

type Dept = { id: string; name: string };

export function EmployeeEditPanel({
  employee,
  departments,
}: {
  employee: {
    id: string;
    full_name: string;
    employee_code: string;
    phone: string | null;
    department_id: string | null;
    base_salary: number;
    currency: string;
    employee_type?: "office" | "online";
    bound_device_id: string | null;
    bound_device_label: string | null;
    bound_device_at: string | null;
    pending_device_id: string | null;
    pending_device_label: string | null;
    pending_device_at: string | null;
  };
  departments: Dept[];
}) {
  const [editState, editAction, editPending] = useActionState(
    updateEmployeeProfileAction,
    initial,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearEmployeeDeviceAction,
    initial,
  );
  const [approveState, approveAction, approvePending] = useActionState(
    approveEmployeeDeviceAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <form action={editAction} className="panel space-y-4 p-5">
        <input type="hidden" name="employeeId" value={employee.id} />
        <div>
          <h2 className="text-lg font-semibold">دەستکاری کارمەند</h2>
          <p className="mt-1 text-sm text-ink-muted">
            ئایدی: <span dir="ltr">{employee.employee_code}</span>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">ناو</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={employee.full_name}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">مۆبایل (ژمارە)</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={employee.phone || ""}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <Label htmlFor="baseSalary">مووچە</Label>
            <Input
              id="baseSalary"
              name="baseSalary"
              type="number"
              min={0}
              step="0.01"
              defaultValue={employee.base_salary}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <Label htmlFor="currency">دراو</Label>
            <select
              id="currency"
              name="currency"
              defaultValue={employee.currency || "IQD"}
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
            >
              <option value="IQD">{currencyLabel("IQD")}</option>
              <option value="USD">{currencyLabel("USD")}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="departmentId">بەش</Label>
            <select
              id="departmentId"
              name="departmentId"
              defaultValue={employee.department_id || ""}
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>جۆری کارمەند</Label>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="employeeType"
                  value="office"
                  defaultChecked={
                    (employee.employee_type || "office") === "office"
                  }
                />
                کارمەندی ئۆفیس
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="employeeType"
                  value="online"
                  defaultChecked={employee.employee_type === "online"}
                />
                کارمەندی ئۆنلاین
              </label>
            </div>
          </div>
        </div>
        {editState.error && (
          <p className="text-sm text-red-600">{editState.error}</p>
        )}
        {editState.success && (
          <p className="text-sm text-brand-700">{editState.success}</p>
        )}
        <Button type="submit" disabled={editPending}>
          {editPending ? ckb.loading : "پاشەکەوتکردنی گۆڕانکاری"}
        </Button>
      </form>

      <div className="panel space-y-3 p-5">
        <h2 className="text-lg font-semibold">مۆبایلی بەستراو</h2>
        {employee.bound_device_id ? (
          <div className="rounded-xl bg-surface-muted/50 px-3 py-3 text-sm">
            <p className="font-medium">
              {employee.bound_device_label || "مۆبایل"}
            </p>
            <p className="mt-1 break-all text-xs text-ink-muted" dir="ltr">
              ئایدی مۆبایل: {employee.bound_device_id}
            </p>
            {employee.bound_device_at && (
              <p className="mt-1 text-xs text-ink-muted" dir="ltr">
                بەستراو:{" "}
                {employee.bound_device_at.slice(0, 16).replace("T", " ")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            هێشتا مۆبایل نەبەستراوە — یەکەم چوونەژوورەوە مۆبایل تۆمار دەکات
          </p>
        )}

        {employee.pending_device_id && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              داواکاری مۆبایلی نوێ
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {employee.pending_device_label || "مۆبایل"}
            </p>
            <p className="mt-1 break-all text-xs text-ink-muted" dir="ltr">
              {employee.pending_device_id}
            </p>
            <form action={approveAction} className="mt-3">
              <input type="hidden" name="employeeId" value={employee.id} />
              <Button type="submit" disabled={approvePending}>
                {approvePending ? ckb.loading : "پەسەندکردنی مۆبایلی نوێ"}
              </Button>
            </form>
            {approveState.error && (
              <p className="mt-2 text-sm text-red-600">{approveState.error}</p>
            )}
            {approveState.success && (
              <p className="mt-2 text-sm text-brand-700">{approveState.success}</p>
            )}
          </div>
        )}

        <form action={clearAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <Button type="submit" variant="secondary" disabled={clearPending}>
            {clearPending ? ckb.loading : "لابردنی بەستنی مۆبایل"}
          </Button>
        </form>
        {clearState.error && (
          <p className="text-sm text-red-600">{clearState.error}</p>
        )}
        {clearState.success && (
          <p className="text-sm text-brand-700">{clearState.success}</p>
        )}
      </div>
    </div>
  );
}
