"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(
  () =>
    import("@/components/employees/online-employees-map-inner").then(
      (m) => m.OnlineEmployeesMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-line bg-surface-muted text-sm text-ink-muted">
        نەخشە بار دەبێت...
      </div>
    ),
  },
);

export type OnlinePoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activity: string;
  kind?: string;
};

export function OnlineEmployeesMap({ points }: { points: OnlinePoint[] }) {
  if (points.length === 0) {
    return (
      <div className="panel flex h-[200px] items-center justify-center text-sm text-ink-muted">
        هێشتا هیچ شوێنێک نەنێردراوە
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden p-0">
      <MapInner points={points} />
    </div>
  );
}

export { OnlineEmployeesMap as LiveEmployeesMap };
