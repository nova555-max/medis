"use client";

import { useActionState } from "react";
import { reviewLeaveFormAction, type ActionResult } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";

const initial: ActionResult = {};

export function LeaveReviewForm({
  leaveId,
  employeeName,
  summary,
  reason,
}: {
  leaveId: string;
  employeeName: string;
  summary: string;
  reason?: string | null;
}) {
  const [state, formAction, pending] = useActionState(reviewLeaveFormAction, initial);

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <input type="hidden" name="leaveId" value={leaveId} />

      <div>
        <p className="font-semibold">{employeeName}</p>
        <p className="text-sm text-ink-muted">{summary}</p>
        {reason ? <p className="mt-2 text-sm">هۆکاری کارمەند: {reason}</p> : null}
      </div>

      <div>
        <label htmlFor={`note-${leaveId}`} className="mb-1.5 block text-sm font-medium">
          تێبینی / هۆکاری بڕیار
        </label>
        <textarea
          id={`note-${leaveId}`}
          name="note"
          rows={3}
          placeholder="بۆ ڕەتکردنەوە پێویستە — بۆ پەسەندکردن ئارەزوومەندانەیە"
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-brand-700">{state.success}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="status"
          value="approved"
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {pending ? "..." : "پەسەندکردن"}
        </Button>
        <Button
          type="submit"
          name="status"
          value="rejected"
          disabled={pending}
          variant="ghost"
          className="text-red-600"
        >
          {pending ? "..." : "ڕەتکردنەوە"}
        </Button>
      </div>
    </form>
  );
}
