"use client";

import { useActionState } from "react";
import {
  markAbsencesAction,
  type AttendanceAdminResult,
} from "@/lib/actions/attendance-admin";
import { Button } from "@/components/ui/button";

const initial: AttendanceAdminResult = {};

export function MarkAbsencesButton({ date }: { date: string }) {
  const [state, action, pending] = useActionState(markAbsencesAction, initial);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="date" value={date} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "..." : "دانانی غائیب بۆ ئەم ڕۆژە"}
      </Button>
      {state.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-emerald-700">{state.success}</p>
      ) : null}
    </form>
  );
}
