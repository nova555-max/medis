"use client";

import { useActionState } from "react";
import { createHolidayAction, type ActionResult } from "@/lib/actions/org-phase2";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function HolidayCreateForm() {
  const [state, formAction, pending] = useActionState(createHolidayAction, initial);

  return (
    <form action={formAction} className="panel space-y-3 p-5">
      <input type="hidden" name="branchId" value="" />
      <div>
        <h2 className="text-base font-semibold">پشووی زیادە</h2>
        <p className="mt-1 text-xs text-ink-muted">
          بۆ نموونە: نەورۆز، جەژن، یان هەر ڕۆژێک کە دەتەوێت پشوو بێت (جگە لە
          هەینی)
        </p>
      </div>
      <div>
        <Label htmlFor="name">ناوی پشوو</Label>
        <Input id="name" name="name" placeholder="بۆ نموونە: نەورۆز" required />
      </div>
      <div>
        <Label htmlFor="holidayDate">بەروار</Label>
        <Input
          id="holidayDate"
          name="holidayDate"
          type="date"
          required
          dir="ltr"
          className="text-left"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="recurring" className="h-4 w-4" />
        هەموو ساڵ دووبارە ببێتەوە
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.add}
      </Button>
    </form>
  );
}
