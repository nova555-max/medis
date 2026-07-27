"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck2,
  Palmtree,
  BarChart3,
  Bell,
  QrCode,
  ScrollText,
  DatabaseBackup,
  Settings,
  Wallet,
  MapPinned,
  Clock3,
  CalendarDays,
  KeyRound,
  IdCard,
  FileSignature,
} from "lucide-react";
import { ckb } from "@/lib/ckb";
import { cn } from "@/lib/cn";
import {
  UnreadBadge,
  useUnreadNotificationCount,
} from "@/hooks/use-unread-notifications";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  ownerOnly?: boolean;
  badgeKey?: "notifications";
};

const nav: NavItem[] = [
  { href: "/", label: ckb.dashboard, icon: LayoutDashboard },
  { href: "/employees", label: ckb.employees, icon: Users },
  { href: "/password-requests", label: "داواکاری وشەی نهێنی", icon: KeyRound },
  { href: "/online-employees", label: "شوێنی ڕاستەوخۆ", icon: MapPinned },
  { href: "/shifts", label: ckb.shifts, icon: Clock3 },
  { href: "/holidays", label: ckb.holidays, icon: CalendarDays },
  { href: "/departments", label: ckb.departments, icon: Building2 },
  { href: "/attendance", label: ckb.attendance, icon: CalendarCheck2 },
  { href: "/gps-history", label: ckb.gpsHistory, icon: MapPinned },
  { href: "/leave", label: ckb.leave, icon: Palmtree },
  { href: "/payroll", label: ckb.payroll, icon: Wallet },
  { href: "/reports", label: ckb.reports, icon: BarChart3 },
  {
    href: "/notifications",
    label: ckb.notifications,
    icon: Bell,
    badgeKey: "notifications",
  },
  { href: "/qr", label: ckb.qr, icon: QrCode },
  { href: "/press-badges", label: ckb.pressBadges, icon: IdCard },
  { href: "/contracts", label: ckb.contracts, icon: FileSignature },
  { href: "/activity-logs", label: ckb.activityLogs, icon: ScrollText, ownerOnly: true },
  { href: "/backups", label: ckb.backups, icon: DatabaseBackup, ownerOnly: true },
  { href: "/settings", label: ckb.settings, icon: Settings, ownerOnly: true },
];

export function Sidebar({
  companyName,
  role,
  onNavigate,
}: {
  companyName?: string;
  role?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isOwner = role !== "manager";
  const unread = useUnreadNotificationCount();

  return (
    <aside className="flex h-full flex-col border-l border-line bg-surface-elevated/90 backdrop-blur">
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            م
          </div>
          <div>
            <p className="text-sm font-bold text-ink">{ckb.appName}</p>
            <p className="truncate text-xs text-ink-muted">
              {companyName || ckb.tagline}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav
          .filter((item) => !item.ownerOnly || isOwner)
          .map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge =
              item.badgeKey === "notifications" && unread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-brand-600 text-white shadow-soft"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                <span className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {showBadge ? (
                    <span className="absolute -left-1.5 -top-1.5">
                      <UnreadBadge
                        count={unread}
                        tone={active ? "onDark" : "danger"}
                        className="scale-90"
                      />
                    </span>
                  ) : null}
                </span>
                <span className="flex-1">{item.label}</span>
                {showBadge ? (
                  <UnreadBadge
                    count={unread}
                    tone={active ? "onDark" : "danger"}
                  />
                ) : null}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
