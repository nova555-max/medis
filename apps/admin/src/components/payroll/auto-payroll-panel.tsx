"use client";

import { useActionState } from "react";
import {
  generateMonthlyPayrollAction,
  type ActionResult,
} from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult = {};

export function AutoPayrollPanel() {
  const [state, formAction, pending] = useActionState(
    generateMonthlyPayrollAction,
    initial,
  );
  const now = new Date();

  return (
    <form
      action={formAction}
      className="panel space-y-4 border-brand-200 bg-brand-50/40 p-5 dark:border-brand-900 dark:bg-brand-950/20"
    >
      <div>
        <h2 className="text-lg font-semibold">مووچەی خۆکار</h2>
        <p className="mt-1 text-sm text-ink-muted">
          سیستەم خۆی پڕ دەکاتەوە: مووچەی بنەڕەتی + پاداشت − غەرامە = کۆی خاوێن.
          تەنها مووچەی بنەڕەتی لە پەڕەی کارمەند دابنێ.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <div>
          <Label htmlFor="auto-year">ساڵ</Label>
          <Input
            id="auto-year"
            name="year"
            type="number"
            required
            defaultValue={now.getFullYear()}
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label htmlFor="auto-month">مانگ</Label>
          <Input
            id="auto-month"
            name="month"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={now.getMonth() + 1}
            dir="ltr"
            className="text-left"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? ckb.loading : "دروستکردنی مووچەی مانگ خۆکار"}
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm font-medium text-brand-700">{state.success}</p>
      )}

      <ul className="space-y-1 text-xs text-ink-muted">
        <li>• مووچە ← لە پڕۆفایلی کارمەند (دینار یان دۆلار)</li>
        <li>• پاداشت / غەرامە ← خۆکار دەچنە سەر هەمان مانگ</li>
        <li>• کۆی خاوێن ← خۆکار حیساب دەکرێت</li>
      </ul>
    </form>
  );
}
