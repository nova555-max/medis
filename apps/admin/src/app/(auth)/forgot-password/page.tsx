import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ckb } from "@/lib/ckb";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="وشەی نهێنیت لەبیرچووە؟"
      subtitle="کۆدی ٦ ژمارەیی بۆ ئیمەیڵت دەنێردرێت"
    >
      <Suspense fallback={<p className="text-sm text-ink-muted">{ckb.loading}</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
