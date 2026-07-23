"use client";

import { useEffect, useState } from "react";

export function BigLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const date = now
    ? now.toLocaleDateString("ckb-IQ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "\u00A0";

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-800/20 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-950 p-5 text-white shadow-soft">
      <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-brand-400/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-6 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      <p className="relative text-sm text-white/75">کاتی ئێستا</p>
      <p
        className="relative mt-2 font-display text-4xl font-bold tracking-tight tabular-nums md:text-5xl"
        suppressHydrationWarning
      >
        {time}
      </p>
      <p className="relative mt-2 text-sm text-white/80" suppressHydrationWarning>
        {date}
      </p>
    </div>
  );
}
