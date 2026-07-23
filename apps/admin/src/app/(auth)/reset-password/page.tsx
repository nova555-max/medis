import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="دروستکردنی وشەی نهێنی نوێ"
      subtitle="وشەی نهێنی بەهێز دابنێ"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
