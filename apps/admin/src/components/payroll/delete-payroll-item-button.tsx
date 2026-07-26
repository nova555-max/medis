"use client";

import { useActionState } from "react";
import {
  deletePayrollItemAction,
  type ActionResult,
} from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";

const initial: ActionResult = {};

export function DeletePayrollItemButton({
  itemId,
  kind,
  voided,
}: {
  itemId: string;
  kind: "reward" | "fine";
  voided?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deletePayrollItemAction,
    initial,
  );

  if (voided) {
    return (
      <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
        هەڵوەشێنراوە
      </span>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            kind === "fine"
              ? "دڵنیایت ئەم غەرامەیە هەڵبوەشێنیتەوە؟ لە مووچە لادەبرێت و دووبارە دروست نابێتەوە."
              : "دڵنیایت پاداشت بسڕیتەوە؟",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <Button
        type="submit"
        variant="ghost"
        disabled={pending}
        className="px-2 py-1 text-xs text-red-600"
      >
        {pending
          ? "..."
          : kind === "fine"
            ? "هەڵوەشاندنەوە"
            : "سڕینەوە"}
      </Button>
      {state.error ? (
        <span className="mr-2 text-xs text-red-600">{state.error}</span>
      ) : null}
      {state.success ? (
        <span className="mr-2 text-xs text-emerald-700">{state.success}</span>
      ) : null}
    </form>
  );
}
