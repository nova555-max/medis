"use client";

import { useActionState } from "react";
import { createShiftAction, type ActionResult } from "@/lib/actions/org-phase2";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function ShiftCreateForm() {
  const [state, formAction, pending] = useActionState(createShiftAction, initial);

  return (
    <form action={formAction} className="panel space-y-3 p-5">
      <div>
        <Label htmlFor="name">ناوی شفت</Label>
        <Input id="name" name="name" placeholder="بۆ نموونە: بەیانی" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startTime">دەستپێک</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="09:00" required dir="ltr" className="text-left" />
        </div>
        <div>
          <Label htmlFor="endTime">کۆتایی</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="17:00" required dir="ltr" className="text-left" />
        </div>
      </div>
      <div>
        <Label htmlFor="grace">خولەکی لێخۆشبوون</Label>
        <Input id="grace" name="grace" type="number" min={0} defaultValue={15} dir="ltr" className="text-left" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.add}
      </Button>
    </form>
  );
}
