import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ckb } from "@/lib/ckb";

export function AuthShell({
  title,
  subtitle,
  children,
  logoUrl,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  logoUrl?: string | null;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgb(42 90 143 / 0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgb(86 143 197 / 0.14), transparent 45%)",
        }}
      />

      <div className="absolute left-4 top-4 z-10 md:left-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.4s_ease-out]">
        <div className="mb-8 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={ckb.appName}
              className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-line object-contain shadow-soft"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-soft">
              م
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {ckb.appName}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-[0_20px_60px_-20px_rgba(19,34,56,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-surface-elevated/70 md:p-8">
          <h2 className="mb-6 text-xl font-semibold text-ink">{title}</h2>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink">
            © {new Date().getFullYear()} {ckb.appName}
          </Link>
        </p>
      </div>
    </div>
  );
}
