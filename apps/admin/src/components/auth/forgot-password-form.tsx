"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordOtpAction,
  type OtpState,
} from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: OtpState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordOtpAction,
    initial,
  );

  return (
    <div className="space-y-4 animate-[fadeIn_0.35s_ease-out]">
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/80 bg-red-50/90 px-3.5 py-3 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <p className="text-sm text-ink-muted">
          ئیمەیڵی بەڕێوەبەر بنووسە — کۆدی ٦ ژمارەیی بۆ ١٠ خولەک دەنێردرێت.
        </p>

        <div>
          <Label htmlFor="email">{ckb.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            className="text-left"
            placeholder="admin@company.com"
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {ckb.loading}
            </span>
          ) : (
            "ناردنی کۆدی پشتڕاستکردنەوە"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          گەڕانەوە بۆ چوونەژوورەوە
        </Link>
      </p>
    </div>
  );
}
