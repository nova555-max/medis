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
}: {
  itemId: string;
  kind: "reward" | "fine";
}) {
  const [state, formAction, pending] = useActionState(
    deletePayrollItemAction,
    initial,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            kind === "fine"
              ? "دڵنیایت غەرامە بسڕیتەوە؟"
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
        {pending ? "..." : "سڕینەوە"}
      </Button>
      {state.error ? (
        <span className="mr-2 text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
