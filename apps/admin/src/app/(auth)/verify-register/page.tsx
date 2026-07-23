import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyRegisterForm } from "@/components/auth/verify-register-form";
import { ckb } from "@/lib/ckb";

export default function VerifyRegisterPage() {
  return (
    <AuthShell
      title="پشتڕاستکردنەوەی ئیمەیڵ"
      subtitle="کۆدی ٦ ژمارەیی لە ئیمەیڵەکەت بنووسە — پاشان هەژمار دروست دەبێت"
    >
      <Suspense fallback={<p className="text-sm text-ink-muted">{ckb.loading}</p>}>
        <VerifyRegisterForm />
      </Suspense>
    </AuthShell>
  );
}
