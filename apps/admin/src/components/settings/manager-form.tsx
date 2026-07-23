"use client";

import { useActionState } from "react";
import {
  createManagerAction,
  type ManagerState,
} from "@/lib/actions/managers";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initial: ManagerState = {};

export function ManagerForm() {
  const [state, action, pending] = useActionState(createManagerAction, initial);

  return (
    <form action={action} className="panel grid gap-3 p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-lg font-semibold">یاریدەدەری ئەدمین (Manager)</h2>
        <p className="mt-1 text-sm text-ink-muted">
          دەتوانێت دەوام، مۆڵەت، کارمەند و مووچە بەڕێوەببات — ڕێکخستنەکان نا
        </p>
      </div>
      <div>
        <Label htmlFor="mgrName">ناو</Label>
        <Input id="mgrName" name="fullName" required />
      </div>
      <div>
        <Label htmlFor="mgrEmail">ئیمەیڵ</Label>
        <Input
          id="mgrEmail"
          name="email"
          type="email"
          required
          dir="ltr"
          className="text-left"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="mgrPassword">وشەی نهێنی</Label>
        <Input
          id="mgrPassword"
          name="password"
          type="password"
          required
          minLength={8}
          dir="ltr"
          className="text-left"
        />
      </div>
      {state.error ? (
        <p className="md:col-span-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="md:col-span-2 text-sm text-emerald-700">{state.success}</p>
      ) : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "..." : "دروستکردنی یاریدەدەر"}
        </Button>
      </div>
    </form>
  );
}
