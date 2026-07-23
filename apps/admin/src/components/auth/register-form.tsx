"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: AuthState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
        {ckb.registerHint}
      </p>

      {state.error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="companyName">{ckb.companyName}</Label>
        <Input id="companyName" name="companyName" required />
      </div>

      <div>
        <Label htmlFor="fullName">{ckb.fullName}</Label>
        <Input id="fullName" name="fullName" required />
      </div>

      <div>
        <Label htmlFor="phone">{ckb.phone}</Label>
        <Input id="phone" name="phone" dir="ltr" className="text-left" />
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
        {pending ? ckb.loading : ckb.createWorkspace}
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
