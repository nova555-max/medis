"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { registerAction, type RegisterOtpState } from "@/lib/actions/register-otp";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: RegisterOtpState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  useEffect(() => {
    if (state.success === "otp_sent" && state.email && !state.inlineCode) {
      const q = new URLSearchParams({
        email: state.email,
        ...(state.expiresAt ? { expires: state.expiresAt } : {}),
      });
      window.location.assign(`/verify-register?${q.toString()}`);
    }
  }, [state.success, state.email, state.expiresAt, state.inlineCode]);

  return (
    <form action={formAction} className="space-y-4">
      <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
        {ckb.registerHint}
      </p>
      <p className="rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm text-ink-muted">
        دوای پڕکردنەوە، کۆدی ٦ ژمارەیی بۆ ئیمەیڵەکەت دەنێردرێت بۆ پشتڕاستکردنەوە.
      </p>

      {state.error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </div>
      )}

      {state.warning && state.inlineCode && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p>{state.warning}</p>
          <p className="text-center text-xs text-ink-muted">کۆدی پشتڕاستکردنەوە</p>
          <p
            className="rounded-xl bg-white px-3 py-3 text-center text-3xl font-bold tracking-[0.35em] text-brand-700 dark:bg-surface-elevated"
            dir="ltr"
          >
            {state.inlineCode}
          </p>
          <Link
            href={`/verify-register?email=${encodeURIComponent(state.email || "")}${
              state.expiresAt
                ? `&expires=${encodeURIComponent(state.expiresAt)}`
                : ""
            }`}
            className="inline-flex w-full justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            بەردەوامبوون بۆ نووسینی کۆد
          </Link>
        </div>
      )}

      <div>
        <Label htmlFor="companyName">{ckb.companyName}</Label>
        <Input id="companyName" name="companyName" required />
      </div>

      <div>
        <Label htmlFor="email">{ckb.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          dir="ltr"
          className="text-left"
        />
      </div>

      <div>
        <Label htmlFor="password">{ckb.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          dir="ltr"
          className="text-left"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? ckb.loading : "ناردنی کۆدی پشتڕاستکردنەوە"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        {ckb.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {ckb.login}
        </Link>
      </p>
    </form>
  );
}
