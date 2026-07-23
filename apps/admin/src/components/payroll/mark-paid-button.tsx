"use client";

import { useActionState } from "react";
import {
  markSalaryPaidAction,
  type ActionResult,
} from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";

const initial: ActionResult = {};

export function MarkPaidButton({
  salaryId,
  disabled,
}: {
  salaryId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    markSalaryPaidAction,
    initial,
  );

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="salaryId" value={salaryId} />
      <Button
        type="submit"
        variant="secondary"
        disabled={disabled || pending}
        className="px-3 py-2 text-xs"
      >
        {pending ? "..." : "پارەدرا"}
      </Button>
      {state.error && (
        <span className="mr-2 text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
