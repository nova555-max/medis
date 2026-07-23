import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getAdminRegistrationStatus } from "@/lib/auth/admin-slots";
import { ckb } from "@/lib/ckb";
import Link from "next/link";

export default async function RegisterPage() {
  const slots = await getAdminRegistrationStatus();
  const locked = slots.known && slots.used >= slots.maxAllowed;

  if (locked) {
    return (
      <AuthShell title={ckb.register} subtitle="تۆمارکردن داخراوە">
        <div className="space-y-4 text-center">
          <p className="rounded-xl border border-line bg-surface-muted px-4 py-5 text-sm text-ink-muted">
            دروستکردنی هەژماری ئەدمین داخراوە.
            <br />
            تەنها {slots.maxAllowed} هەژماری ئەدمین ڕێگەپێدراوە ({slots.used}/
            {slots.maxAllowed}).
          </p>
          <Link href="/login" className="text-sm font-medium text-brand-600 hover:underline">
            گەڕانەوە بۆ چوونەژوورەوە
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={ckb.register} subtitle={ckb.createWorkspace}>
      {slots.known ? (
        <p className="mb-4 text-center text-xs text-ink-muted">
          شوێنی ماوە: {Math.max(slots.maxAllowed - slots.used, 0)} لە{" "}
          {slots.maxAllowed}
        </p>
      ) : (
        <p className="mb-4 text-center text-xs text-amber-700 dark:text-amber-300">
          پشکنینی شوێنەکان ئەنجامنەدرا — دەتوانیت هەوڵی تۆمارکردن بدەیت.
        </p>
      )}
      <RegisterForm />
    </AuthShell>
  );
}
