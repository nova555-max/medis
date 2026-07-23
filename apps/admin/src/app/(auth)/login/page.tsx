import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getAdminRegistrationStatus } from "@/lib/auth/admin-slots";
import { ckb } from "@/lib/ckb";

export default async function LoginPage() {
  const slots = await getAdminRegistrationStatus();

  return (
    <AuthShell title="چوونەژوورەوەی ئەدمین" subtitle={ckb.tagline}>
      <Suspense fallback={<p className="text-sm text-ink-muted">{ckb.loading}</p>}>
        <LoginForm registrationOpen={slots.open} />
      </Suspense>
    </AuthShell>
  );
}
