"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { ckb } from "@/lib/ckb";

export function DashboardShell({
  companyName,
  adminName,
  role,
  children,
}: {
  companyName?: string;
  adminName?: string;
  role?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar companyName={companyName} role={role} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[280px] shadow-soft">
            <Sidebar
              companyName={companyName}
              role={role}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-elevated lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-ink">{adminName || ckb.dashboard}</p>
              <p className="text-xs text-ink-muted lg:hidden">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" className="h-10">
                {ckb.logout}
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
