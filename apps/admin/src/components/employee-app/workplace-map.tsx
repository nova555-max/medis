"use client";

import dynamic from "next/dynamic";

const WorkplaceMapInner = dynamic(
  () =>
    import("@/components/employee-app/workplace-map-inner").then(
      (m) => m.WorkplaceMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center rounded-3xl border border-line bg-surface-muted text-sm text-ink-muted">
        نەخشەی GPS بار دەبێت...
      </div>
    ),
  },
);

export function WorkplaceMap(props: {
  lat: number | null;
  lng: number | null;
  radius: number;
  enabled: boolean;
  tall?: boolean;
}) {
  return <WorkplaceMapInner {...props} />;
}
