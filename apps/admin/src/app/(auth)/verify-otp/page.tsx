import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { ckb } from "@/lib/ckb";

export default function VerifyOtpPage() {
  return (
    <AuthShell
      title="پشتڕاستکردنەوەی کۆد"
      subtitle="کۆدی ٦ ژمارەیی لە ئیمەیڵەکەت بنووسە"
    >
      <Suspense fallback={<p className="text-sm text-ink-muted">{ckb.loading}</p>}>
        <VerifyOtpForm />
      </Suspense>
    </AuthShell>
  );
}
