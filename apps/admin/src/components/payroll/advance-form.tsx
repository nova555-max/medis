"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addSalaryAdvanceAction,
  cancelSalaryAdvanceAction,
  type ActionResult,
} from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel, formatMoney } from "@/lib/money";

const initial: ActionResult = {};

type Employee = {
  id: string;
  full_name: string;
  employee_code: string;
  currency?: string;
};

type Advance = {
  id: string;
  amount: number;
  remaining: number;
  installment_amount: number;
  currency: string;
  note: string | null;
  status: string;
  created_at: string;
  employees: { full_name?: string; employee_code?: string } | null;
};

export function AdvanceForm({
  employees,
  advances,
}: {
  employees: Employee[];
  advances: Advance[];
}) {
  const [state, formAction, pending] = useActionState(
    addSalaryAdvanceAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">پێشەکی مووچە</h2>
          <p className="mt-1 text-sm text-ink-muted">
            بڕی پێشەکی و قیستی مانگانە — خۆکار لە مووچە دەبڕدرێت
          </p>
        </div>

        <div>
          <Label htmlFor="adv-employee">کارمەند</Label>
          <select
            id="adv-employee"
            name="employeeId"
            required
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            <option value="">هەڵبژێرە</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.employee_code}) · {e.currency || "IQD"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="adv-amount">بڕی پێشەکی</Label>
            <Input
              id="adv-amount"
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <Label htmlFor="adv-installment">قیستی مانگانە</Label>
            <Input
              id="adv-installment"
              name="installmentAmount"
              type="number"
              min={0.01}
              step="0.01"
              required
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <Label htmlFor="adv-currency">دراو</Label>
            <select
              id="adv-currency"
              name="currency"
              defaultValue="IQD"
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
            >
              <option value="IQD">{currencyLabel("IQD")}</option>
              <option value="USD">{currencyLabel("USD")}</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="adv-note">تێبینی</Label>
          <Input id="adv-note" name="note" placeholder="ئارەزوومەندانە" />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-brand-700">{state.success}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? ckb.loading : "تۆماری پێشەکی"}
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">لیستی پێشەکییەکان</h3>
        {advances.length === 0 ? (
          <div className="panel p-6 text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {advances.map((a) => (
              <AdvanceCard key={a.id} advance={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdvanceCard({ advance: a }: { advance: Advance }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  function cancel() {
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("advanceId", a.id);
      const res = await cancelSalaryAdvanceAction({}, fd);
      if (res.error) setMsg({ type: "err", text: res.error });
      else setMsg({ type: "ok", text: res.success || "هەڵوەشێنرایەوە." });
    });
  }

  const statusLabel =
    a.status === "active"
      ? "چالاک"
      : a.status === "paid_off"
        ? "تەواوبوو"
        : a.status === "cancelled"
          ? "هەڵوەشاوە"
          : a.status;

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{a.employees?.full_name}</p>
          <p className="text-xs text-ink-muted" dir="ltr">
            {a.employees?.employee_code}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            دۆخ: {statusLabel}
            {a.note ? ` · ${a.note}` : ""}
          </p>
        </div>
        <div className="text-left">
          <p className="text-lg font-bold text-brand-700" dir="ltr">
            {formatMoney(Number(a.amount), a.currency)}
          </p>
          <p className="text-xs text-ink-muted" dir="ltr">
            ماوە: {formatMoney(Number(a.remaining), a.currency)} · قیست:{" "}
            {formatMoney(Number(a.installment_amount), a.currency)}
          </p>
        </div>
      </div>
      {a.status === "active" && (
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="mt-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          {pending ? ckb.loading : "هەڵوەشاندنەوە"}
        </button>
      )}
      {msg && (
        <p
          className={`mt-2 text-xs ${
            msg.type === "err" ? "text-red-600" : "text-brand-700"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
