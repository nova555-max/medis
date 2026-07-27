"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import {
  UnreadBadge,
  useUnreadNotificationCount,
} from "@/hooks/use-unread-notifications";

export function EmployeeHeaderBell() {
  const unread = useUnreadNotificationCount();

  return (
    <Link
      href="/employee/notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-brand-300 hover:text-brand-700"
      aria-label="ئاگادارییەکان"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -left-1 -top-1">
          <UnreadBadge count={unread} />
        </span>
      ) : null}
    </Link>
  );
}
