"use client";

import { useActionState, useMemo, useState } from "react";
import { addPayrollItemAction, type ActionResult } from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";

const initial: ActionResult = {};

export function PayrollItemForm({
  employees,
  kind,
}: {
  employees: {
    id: string;
    full_name: string;
    employee_code: string;
    currency?: string;
  }[];
  kind: "reward" | "fine";
}) {
  const [state, formAction, pending] = useActionState(
    addPayrollItemAction,
    initial,
  );
  const [employeeId, setEmployeeId] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const today = new Date().toISOString().slice(0, 10);
  const isFine = kind === "fine";

  const selected = useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId],
  );

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <input type="hidden" name="kind" value={kind} />
      <h2 className="text-lg font-semibold">
        {isFine ? "غەرامە (خۆکار لە مووچە دەبڕدرێت)" : "پاداشت (خۆکار بۆ مووچە)"}
      </h2>
      <p className="text-sm text-ink-muted">
        {isFine
          ? "دوای تۆمارکردن، بڕەکە خۆکار دەچێتە سەر لێبڕینی مووچەی ئەم مانگە"
          : "دوای تۆمارکردن، بڕەکە خۆکار دەچێتە سەر پاداشتی مووچەی ئەم مانگە"}
      </p>

      <div>
        <Label htmlFor={`${kind}-employee`}>کارمەند</Label>
        <select
          id={`${kind}-employee`}
          name="employeeId"
          required
          value={employeeId}
          onChange={(e) => {
            const id = e.target.value;
            setEmployeeId(id);
            const emp = employees.find((x) => x.id === id);
            setCurrency(emp?.currency === "USD" ? "USD" : "IQD");
          }}
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

      <div>
        <Label htmlFor={`${kind}-title`}>ناونیشان</Label>
        <Input
          id={`${kind}-title`}
          name="title"
          required
          placeholder={
            isFine ? "بۆ نموونە: دواکەوتن" : "بۆ نموونە: پاداشتی کارکردن"
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${kind}-amount`}>بڕ</Label>
          <Input
            id={`${kind}-amount`}
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={0}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor={`${kind}-currency`}>دراو</Label>
          <select
            id={`${kind}-currency`}
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            <option value="IQD">{currencyLabel("IQD")}</option>
            <option value="USD">{currencyLabel("USD")}</option>
          </select>
          {selected ? (
            <p className="mt-1 text-xs text-ink-muted">
              دەتوانیت بگۆڕیت بۆ دینار یان دۆلار
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={`${kind}-date`}>بەروار</Label>
          <Input
            id={`${kind}-date`}
            name="rewardDate"
            type="date"
            defaultValue={today}
            dir="ltr"
            className="text-left"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${kind}-note`}>
          {isFine ? "هۆکاری غەرامە" : "تێبینی"}
        </Label>
        <Input
          id={`${kind}-note`}
          name="note"
          placeholder={
            isFine ? "بۆ نموونە: دواکەوتنی ٣٠ خولەک" : "ئارەزوومەندانە"
          }
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-brand-700">{state.success}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : isFine ? "تۆماری غەرامە" : "تۆماری پاداشت"}
      </Button>
    </form>
  );
}
