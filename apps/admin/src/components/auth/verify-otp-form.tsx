"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  resendPasswordOtpAction,
  verifyPasswordOtpAction,
  type OtpState,
} from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { ckb } from "@/lib/ckb";

const initial: OtpState = {};

export function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const expiresParam = searchParams.get("expires");

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [now, setNow] = useState(() => Date.now());

  const expiresAt = useMemo(() => {
    if (!expiresParam) return Date.now() + 10 * 60 * 1000;
    const t = new Date(expiresParam).getTime();
    return Number.isFinite(t) ? t : Date.now() + 10 * 60 * 1000;
  }, [expiresParam]);

  const remainingSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");
  const expired = remainingSec <= 0;

  const [verifyState, verifyAction, verifying] = useActionState(
    verifyPasswordOtpAction,
    initial,
  );
  const [resendState, resendAction, resending] = useActionState(
    resendPasswordOtpAction,
    initial,
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const code = digits.join("");

  function setDigit(index: number, value: string) {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i]!;
    setDigits(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  }

  if (!email) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          سەرەتا ئیمەیڵ بنووسە.
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex w-full justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          گەڕانەوە
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-[fadeIn_0.35s_ease-out]">
      <p className="text-sm text-ink-muted">
        کۆدی ٦ ژمارەیی نێردرا بۆ{" "}
        <span className="font-medium text-ink" dir="ltr">
          {email}
        </span>
      </p>

      <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/60 px-3 py-2 text-sm">
        <span className="text-ink-muted">کاتی ماوە</span>
        <span
          className={`font-bold tabular-nums ${expired ? "text-red-600" : "text-ink"}`}
          dir="ltr"
        >
          {mm}:{ss}
        </span>
      </div>

      {(verifyState.error || resendState.error) && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/80 bg-red-50/90 px-3.5 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
        >
          {verifyState.error || resendState.error}
        </div>
      )}

      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={code} />

        <div className="flex justify-center gap-2" dir="ltr" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={d}
              disabled={verifying || expired}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="h-12 w-11 rounded-xl border border-line bg-surface-elevated text-center text-xl font-bold text-ink shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
            />
          ))}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={verifying || expired || code.length !== 6}
        >
          {verifying ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {ckb.loading}
            </span>
          ) : (
            "پشتڕاستکردنەوە"
          )}
        </Button>
      </form>

      <form action={resendAction} className="space-y-2">
        <input type="hidden" name="email" value={email} />
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={resending || (!expired && remainingSec > 9 * 60)}
        >
          {resending ? ckb.loading : "دووبارە ناردنی کۆد"}
        </Button>
        <p className="text-center text-xs text-ink-muted">
          دووبارە ناردن دوای بەسەرچوون یان دوای ١ خولەک بەردەستە
        </p>
      </form>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          گەڕانەوە بۆ چوونەژوورەوە
        </Link>
      </p>
    </div>
  );
}
