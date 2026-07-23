"use client";

import { useActionState } from "react";
import { sendAnnouncementAction, type ActionResult } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function AnnouncementForm() {
  const [state, formAction, pending] = useActionState(sendAnnouncementAction, initial);

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <h2 className="text-lg font-semibold">ناردنی ئاگاداری بۆ کارمەندان</h2>
      <div>
        <Label htmlFor="title">ناونیشان</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="body">ناوەڕۆک</Label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : "ناردن"}
      </Button>
    </form>
  );
}
