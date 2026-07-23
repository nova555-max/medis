"use client";

import dynamic from "next/dynamic";
import type { GpsPoint } from "@/components/attendance/gps-history-map";

const GpsHistoryMap = dynamic(
  () =>
    import("@/components/attendance/gps-history-map").then((m) => m.GpsHistoryMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-line bg-surface-muted text-sm text-ink-muted">
        بارکردنی نەخشە...
      </div>
    ),
  },
);

export function GpsHistoryMapClient({ points }: { points: GpsPoint[] }) {
  return <GpsHistoryMap points={points} />;
}
