"use client";

import { useActionState } from "react";
import {
  upsertAttendanceAction,
  type AttendanceAdminResult,
} from "@/lib/actions/attendance-admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initial: AttendanceAdminResult = {};

type Emp = { id: string; full_name: string; employee_code: string };

export function ManualAttendanceForm({
  employees,
  defaultDate,
}: {
  employees: Emp[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(upsertAttendanceAction, initial);

  return (
    <form action={action} className="panel space-y-3 p-4">
      <div>
        <h2 className="font-semibold">دەستکاری / تۆمارکردنی دەوام</h2>
        <p className="text-xs text-ink-muted">
          بۆ کاتێک مۆبایل یان GPS کار ناکات
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="employeeId">کارمەند</Label>
          <select
            id="employeeId"
            name="employeeId"
            required
            className="mt-1 w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              هەڵبژێرە
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.employee_code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="workDate">بەروار</Label>
          <Input
            id="workDate"
            name="workDate"
            type="date"
            defaultValue={defaultDate}
            required
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="status">دۆخ</Label>
          <select
            id="status"
            name="status"
            className="mt-1 w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm"
            defaultValue="present"
          >
            <option value="present">ئامادە</option>
            <option value="late">دواکەوتوو</option>
            <option value="absent">غائیب</option>
            <option value="on_leave">مۆڵەت</option>
            <option value="early_leave">زوو ڕۆیشتوو</option>
            <option value="overtime">کاتی زیادە</option>
            <option value="incomplete">ناتەواو</option>
          </select>
        </div>
        <div>
          <Label htmlFor="checkIn">کاتی هاتن</Label>
          <Input id="checkIn" name="checkIn" type="time" dir="ltr" />
        </div>
        <div>
          <Label htmlFor="checkOut">کاتی چوون</Label>
          <Input id="checkOut" name="checkOut" type="time" dir="ltr" />
        </div>
        <div>
          <Label htmlFor="lateMinutes">خولەکی دواکەوتن</Label>
          <Input
            id="lateMinutes"
            name="lateMinutes"
            type="number"
            min={0}
            defaultValue={0}
            dir="ltr"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label htmlFor="note">تێبینی</Label>
          <Input id="note" name="note" placeholder="ئارەزوومەندانە" />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "..." : "پاشەکەوتکردن"}
      </Button>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">{state.success}</p>
      ) : null}
    </form>
  );
}
