"use client";

import { useActionState } from "react";
import {
  clearEmployeeDeviceAction,
  updateEmployeeProfileAction,
  type ActionResult,
} from "@/lib/actions/employee-admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";

const initial: ActionResult = {};

type Opt = { id: string; name: string };

export function EmployeeEditPanel({
  employee,
  departments,
  positions,
}: {
  employee: {
    id: string;
    full_name: string;
    employee_code: string;
    email: string | null;
    phone: string | null;
    hire_date: string | null;
    notes: string | null;
    department_id: string | null;
    position_id: string | null;
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
  departments: Opt[];
  positions: Opt[];
}) {
  const [editState, editAction, editPending] = useActionState(
    updateEmployeeProfileAction,
    initial,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearEmployeeDeviceAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <form action={editAction} className="panel overflow-hidden">
        <input type="hidden" name="employeeId" value={employee.id} />
        <div className="border-b border-line bg-gradient-to-l from-brand-600/10 via-transparent to-transparent px-5 py-4">
          <h2 className="text-lg font-semibold">زانیاری تەواوی کارمەند</h2>
          <p className="mt-1 text-sm text-ink-muted">
            هەموو خانەکان دەستکاری بکە و پاشەکەوتی بکە
          </p>
        </div>

        <div className="space-y-6 p-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              ناسنامە
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">ناوی تەواو</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={employee.full_name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="employeeCode">کۆدی کارمەند</Label>
                <Input
                  id="employeeCode"
                  name="employeeCode"
                  defaultValue={employee.employee_code}
                  dir="ltr"
                  className="text-left"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">مۆبایل</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={employee.phone || ""}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <Label htmlFor="email">ئیمەیڵ</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={employee.email || ""}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <Label htmlFor="hireDate">بەرواری دامەزراندن</Label>
                <Input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  defaultValue={employee.hire_date || ""}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              کار و ڕێکخستن
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
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
              <div>
                <Label htmlFor="positionId">پۆست</Label>
                <select
                  id="positionId"
                  name="positionId"
                  defaultValue={employee.position_id || ""}
                  className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
                >
                  <option value="">—</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>جۆری کارمەند</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-elevated px-3.5 py-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600/5">
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
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-elevated px-3.5 py-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600/5">
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
              <div className="sm:col-span-2">
                <Label htmlFor="notes">تێبینی</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={employee.notes || ""}
                  className="mt-0 w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              مووچە
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="baseSalary">مووچەی بنەڕەتی</Label>
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
            </div>
          </section>

          {editState.error && (
            <p className="text-sm text-red-600">{editState.error}</p>
          )}
          {editState.success && (
            <p className="text-sm text-brand-700">{editState.success}</p>
          )}
          <Button type="submit" disabled={editPending} className="min-w-40">
            {editPending ? ckb.loading : "پاشەکەوتکردنی گۆڕانکاری"}
          </Button>
        </div>
      </form>

      <div className="panel space-y-3 p-5">
        <h2 className="text-lg font-semibold">مۆبایلی ئێستا</h2>
        <p className="text-xs text-ink-muted">
          کارمەند دەتوانێت لە مۆبایلی نوێوە بچێتە ژوورەوە؛ تۆ ئاگاداری وەردەگریت.
        </p>
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
                دوایین تۆمار:{" "}
                {employee.bound_device_at.slice(0, 16).replace("T", " ")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            هێشتا مۆبایل تۆمار نەکراوە — یەکەم چوونەژوورەوە تۆماری دەکات
          </p>
        )}

        <form action={clearAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <Button type="submit" variant="secondary" disabled={clearPending}>
            {clearPending ? ckb.loading : "سڕینەوەی تۆماری مۆبایل"}
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
