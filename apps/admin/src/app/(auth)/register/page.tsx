import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { ckb } from "@/lib/ckb";

export default function RegisterPage() {
  return (
    <AuthShell title={ckb.register} subtitle={ckb.createWorkspace}>
      <RegisterForm />
    </AuthShell>
  );
}
