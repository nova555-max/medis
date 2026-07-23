import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ckb } from "@/lib/ckb";

export default function LoginPage() {
  return (
    <AuthShell title={ckb.welcomeBack} subtitle={ckb.tagline}>
      <Suspense fallback={<p className="text-sm text-ink-muted">{ckb.loading}</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
