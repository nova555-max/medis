"use client";

import { useActionState } from "react";
import { createBranchAction, type ActionResult } from "@/lib/actions/org-phase2";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function BranchCreateForm() {
  const [state, formAction, pending] = useActionState(createBranchAction, initial);

  return (
    <form action={formAction} className="panel space-y-3 p-5">
      <div>
        <Label htmlFor="name">ناوی لق</Label>
        <Input id="name" name="name" placeholder="بۆ نموونە: هەولێر" required />
      </div>
      <div>
        <Label htmlFor="address">ناونیشان</Label>
        <Input id="address" name="address" placeholder="ئارەستە (ئارەزوومەندانە)" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.add}
      </Button>
    </form>
  );
}
