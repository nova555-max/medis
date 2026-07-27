"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Live unread notification count for the signed-in user (admin or employee). */
export function useUnreadNotificationCount(pollMs = 20000) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCount(0);
        return;
      }
      const { count: n, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!error) setCount(n ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), pollMs);
    const onFocus = () => void refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`unread-notif-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => void refresh(),
        )
        .subscribe();
    } catch {
      /* realtime optional */
    }

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      if (channel) {
        try {
          createClient().removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [refresh, pollMs]);

  return count;
}

export function UnreadBadge({
  count,
  className,
  tone = "danger",
}: {
  count: number;
  className?: string;
  tone?: "danger" | "brand" | "onDark";
}) {
  if (!count || count < 1) return null;
  const label = count > 99 ? "99+" : String(count);
  const toneClass =
    tone === "onDark"
      ? "bg-white text-brand-700"
      : tone === "brand"
        ? "bg-brand-600 text-white"
        : "bg-red-600 text-white";

  return (
    <span
      className={[
        "inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-4 tabular-nums shadow-sm",
        toneClass,
        className || "",
      ].join(" ")}
      aria-label={`${count} ئاگاداری نەخوێندراو`}
    >
      {label}
    </span>
  );
}
