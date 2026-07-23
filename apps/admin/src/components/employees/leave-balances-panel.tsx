"use client";

import { useActionState } from "react";
import {
  upsertLeaveBalanceAction,
  type ActionResult,
} from "@/lib/actions/leave-balances";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initial: ActionResult = {};

type Balance = {
  id?: string;
  leave_type_id: string;
  name_ckb: string;
  year: number;
  entitled_days: number;
  used_days: number;
  remaining_days: number;
};

export function LeaveBalancesPanel({
  employeeId,
  balances,
  leaveTypes,
}: {
  employeeId: string;
  balances: Balance[];
  leaveTypes: { id: string; name_ckb: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    upsertLeaveBalanceAction,
    initial,
  );
  const year = new Date().getFullYear();

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">باڵانسی مۆڵەت ({year})</h2>
        <p className="mt-1 text-sm text-ink-muted">
          ڕۆژە مافی هەبوو / بەکارهاتوو / ماوە
        </p>
      </div>

      <ul className="space-y-2">
        {balances.length === 0 ? (
          <li className="rounded-xl border border-line px-4 py-6 text-center text-sm text-ink-muted">
            هێشتا باڵانس دیاری نەکراوە
          </li>
        ) : (
          balances.map((b) => (
            <li
              key={b.leave_type_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3"
            >
              <span className="font-medium">{b.name_ckb}</span>
              <span className="text-sm text-ink-muted">
                ماف {b.entitled_days} · بەکارهاتوو {b.used_days} · ماوە{" "}
                {b.remaining_days}
              </span>
            </li>
          ))
        )}
      </ul>

      <form action={formAction} className="grid gap-3 border-t border-line pt-4 md:grid-cols-4">
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="year" value={year} />
        <div>
          <Label htmlFor="leaveTypeId">جۆری مۆڵەت</Label>
          <select
            id="leaveTypeId"
            name="leaveTypeId"
            required
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name_ckb}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="entitledDays">ڕۆژی ماف</Label>
          <Input
            id="entitledDays"
            name="entitledDays"
            type="number"
            min={0}
            step="0.5"
            defaultValue={21}
            required
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="usedDays">بەکارهاتوو</Label>
          <Input
            id="usedDays"
            name="usedDays"
            type="number"
            min={0}
            step="0.5"
            defaultValue={0}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "پاشەکەوت..." : "پاشەکەوت"}
          </Button>
        </div>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-brand-700">{state.success}</p>
      )}
    </div>
  );
}
