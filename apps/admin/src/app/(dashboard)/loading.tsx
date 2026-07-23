export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6 p-1">
      <div className="h-8 w-48 rounded-lg bg-surface-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-surface-muted" />
    </div>
  );
}
