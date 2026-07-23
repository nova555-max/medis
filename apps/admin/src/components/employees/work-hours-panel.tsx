"use client";

import { useActionState } from "react";
import {
  updateWorkHoursAction,
  type SettingsState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: SettingsState = {};

type Hours = {
  work_start_time: string;
  work_end_time: string;
  late_grace_minutes: number;
  gps_only_during_work_hours: boolean;
};

export function WorkHoursPanel({ hours }: { hours: Hours }) {
  const [state, formAction, pending] = useActionState(
    updateWorkHoursAction,
    initial,
  );

  return (
    <form action={formAction} className="panel grid gap-4 p-5 md:grid-cols-3">
      <div className="md:col-span-3">
        <h2 className="text-lg font-semibold">کاتی هاتن و چوون</h2>
        <p className="mt-1 text-sm text-ink-muted">
          کاتی دەستپێک و کۆتایی دەوام بۆ هەموو کارمەندان — بۆ دواکەوتن و ئامادەبوون
        </p>
      </div>

      <div>
        <Label htmlFor="workStart">کاتی هاتن</Label>
        <Input
          id="workStart"
          name="workStart"
          type="time"
          defaultValue={String(hours.work_start_time).slice(0, 5)}
          dir="ltr"
          className="text-left"
          required
        />
      </div>
      <div>
        <Label htmlFor="workEnd">کاتی چوون</Label>
        <Input
          id="workEnd"
          name="workEnd"
          type="time"
          defaultValue={String(hours.work_end_time).slice(0, 5)}
          dir="ltr"
          className="text-left"
          required
        />
      </div>
      <div>
        <Label htmlFor="lateGrace">خۆشەویستی دواکەوتن (خولەک)</Label>
        <Input
          id="lateGrace"
          name="lateGrace"
          type="number"
          min={0}
          defaultValue={hours.late_grace_minutes}
          dir="ltr"
          className="text-left"
        />
      </div>

      <label className="flex items-center gap-2 text-sm md:col-span-3">
        <input
          type="checkbox"
          name="gpsOnlyDuringWorkHours"
          defaultChecked={hours.gps_only_during_work_hours}
          className="h-4 w-4"
        />
        بۆ کارمەندانی GPS-چالاک: لە دەرەوەی کاتی دەوام GPS دابخرێت
      </label>

      {state.error && (
        <p className="md:col-span-3 text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="md:col-span-3 text-sm text-brand-700">{state.success}</p>
      )}

      <div className="md:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? ckb.loading : ckb.save}
        </Button>
      </div>
    </form>
  );
}
