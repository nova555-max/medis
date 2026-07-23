import { ThemeToggle } from "@/components/theme-toggle";
import { ckb } from "@/lib/ckb";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute left-4 top-4 md:left-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-soft">
            م
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{ckb.appName}</h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        </div>

        <div className="panel p-6 md:p-8">
          <h2 className="mb-6 text-xl font-semibold text-ink">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
