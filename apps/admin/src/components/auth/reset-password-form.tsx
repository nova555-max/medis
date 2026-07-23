"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  setPasswordWithOtpAction,
  type OtpState,
} from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: OtpState = {};

function scorePassword(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

const strengthLabel = ["زۆر لاواز", "لاواز", "مامناوەند", "باش", "بەهێز", "زۆر بەهێز"];
const strengthColor = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    setPasswordWithOtpAction,
    initial,
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const score = useMemo(() => scorePassword(password), [password]);
  const rules = useMemo(
    () => [
      { ok: password.length >= 8, label: "لانیکەم ٨ پیت" },
      { ok: /[A-Z]/.test(password), label: "پیتی گەورە (A-Z)" },
      { ok: /[a-z]/.test(password), label: "پیتی بچووک (a-z)" },
      { ok: /[0-9]/.test(password), label: "ژمارە" },
      { ok: /[^A-Za-z0-9]/.test(password), label: "هێمای تایبەت" },
    ],
    [password],
  );

  return (
    <div className="space-y-4 animate-[fadeIn_0.35s_ease-out]">
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/80 bg-red-50/90 px-3.5 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="password">وشەی نهێنی نوێ</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              required
              dir="ltr"
              className="pe-20 text-left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
            <button
              type="button"
              className="absolute inset-y-0 left-2 my-auto rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-surface-muted"
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? "شاردنەوە" : "پیشاندان"}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword">دووبارەکردنەوەی وشەی نهێنی</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              dir="ltr"
              className="pe-20 text-left"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={pending}
            />
            <button
              type="button"
              className="absolute inset-y-0 left-2 my-auto rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-surface-muted"
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? "شاردنەوە" : "پیشاندان"}
            </button>
          </div>
          {confirm && confirm !== password ? (
            <p className="mt-1 text-xs text-red-600">یەک ناگرنەوە</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>هێزی وشەی نهێنی</span>
            <span className="font-medium text-ink">
              {password ? strengthLabel[score] : "—"}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  password && i < score
                    ? strengthColor[score]
                    : "bg-surface-muted"
                }`}
              />
            ))}
          </div>
          <ul className="mt-2 grid gap-1 text-xs">
            {rules.map((r) => (
              <li
                key={r.label}
                className={
                  r.ok
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-ink-muted"
                }
              >
                {r.ok ? "✓" : "○"} {r.label}
              </li>
            ))}
          </ul>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={
            pending ||
            rules.some((r) => !r.ok) ||
            !password ||
            password !== confirm
          }
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {ckb.loading}
            </span>
          ) : (
            "پاشەکەوتکردنی وشەی نهێنی"
          )}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-600 hover:underline">
          گەڕانەوە بۆ چوونەژوورەوە
        </Link>
      </p>
    </div>
  );
}
