"use client";

import { useActionState } from "react";
import {
  deleteEmployeeContractAction,
  type ActionResult,
} from "@/lib/actions/contracts";
import { Button } from "@/components/ui/button";

const initial: ActionResult = {};

export function DeleteContractButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    deleteEmployeeContractAction,
    initial,
  );

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("دڵنیایت گرێبەست بسڕیتەوە؟")) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        disabled={pending}
        className="px-3 py-2 text-xs text-red-600"
      >
        {pending ? "..." : "سڕینەوە"}
      </Button>
      {state.error ? (
        <span className="mr-1 text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
