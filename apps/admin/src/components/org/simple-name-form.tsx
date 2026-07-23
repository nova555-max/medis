"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions/org";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function SimpleNameForm({
  action,
  label,
  placeholder,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  label: string;
  placeholder: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="panel space-y-3 p-5">
      <div>
        <Label htmlFor="name">{label}</Label>
        <Input id="name" name="name" placeholder={placeholder} required />
      </div>
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-brand-700 dark:text-brand-300">{state.success}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.add}
      </Button>
    </form>
  );
}
