"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: AuthState = {};

export function LoginForm({ registrationOpen = false }: { registrationOpen?: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const searchParams = useSearchParams();
  const adminOnly = searchParams.get("error") === "admin_only";

  useEffect(() => {
    if (state.success) {
      window.location.assign("/");
    }
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-4">
      {(state.error || adminOnly) && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error || ckb.adminOnly}
        </div>
      )}

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
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password">{ckb.password}</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            وشەی نهێنیت لەبیرچووە؟
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="text-left"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? ckb.loading : ckb.login}
      </Button>

      {registrationOpen ? (
        <p className="text-center text-sm text-ink-muted">
          {ckb.noAccount}{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            {ckb.register}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
