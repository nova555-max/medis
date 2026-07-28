"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
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
  const [stuck, setStuck] = useState(false);
  const pendingSince = useRef<number | null>(null);

  useEffect(() => {
    if (state.success) {
      window.location.replace("/");
    }
  }, [state.success]);

  useEffect(() => {
    if (pending) {
      pendingSince.current = Date.now();
      setStuck(false);
      const t = window.setTimeout(() => {
        if (pendingSince.current) setStuck(true);
      }, 20000);
      return () => window.clearTimeout(t);
    }
    pendingSince.current = null;
    setStuck(false);
  }, [pending]);

  return (
    <form action={formAction} className="space-y-4">
      {(state.error || adminOnly || stuck) && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {stuck
            ? "پەیوەندی درێژخایەن بوو. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە."
            : state.error || ckb.adminOnly}
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

      <Button type="submit" className="w-full" disabled={pending && !stuck}>
        {pending && !stuck ? ckb.loading : ckb.login}
      </Button>

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-brand-600 hover:underline"
        >
          {ckb.forgotPassword}
        </Link>
      </p>

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
