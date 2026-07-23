"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  MapPinned,
  UserRound,
  Wallet,
  Palmtree,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ckb } from "@/lib/ckb";

const items = [
  { href: "/employee", label: "سەرەکی", icon: Home },
  { href: "/employee/leave", label: ckb.leave, icon: Palmtree },
  { href: "/employee/salary", label: ckb.salary, icon: Wallet },
  { href: "/employee/map", label: "نەخشە", icon: MapPinned },
  { href: "/employee/notifications", label: "ئاگاداری", icon: Bell },
  { href: "/employee/profile", label: ckb.profile, icon: UserRound },
];

export function EmployeeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-elevated/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {items.map((item) => {
          const active =
            item.href === "/employee"
              ? pathname === "/employee"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] transition",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "stroke-[2.25px]")} />
              <span className="truncate font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
