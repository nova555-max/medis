import { DashboardAttendanceSection } from "@/components/dashboard/dashboard-attendance-section";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildSeries(
  start: Date,
  days: number,
  rows: { work_date: string; status: string; late_minutes: number | null }[],
) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = isoDate(d);
    const dayRows = rows.filter((r) => r.work_date === key);
    return {
      label: key.slice(5),
      present: dayRows.filter((r) =>
        ["present", "early_leave", "overtime", "incomplete"].includes(r.status),
      ).length,
      late: dayRows.filter(
        (r) => r.status === "late" || (r.late_minutes || 0) > 0,
      ).length,
      absent: dayRows.filter((r) => r.status === "absent").length,
      onLeave: dayRows.filter((r) => r.status === "on_leave").length,
    };
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range === "month" ? "month" : "week";
  const supabase = await createClient();
  const today = new Date();
  const todayIso = isoDate(today);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthDays =
    Math.floor(
      (today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  const seriesStartIso = isoDate(
    range === "month" ? monthStart : weekStart,
  );

  const [
    { count: totalEmployees },
    { data: todayRows },
    { data: seriesRows },
    { data: activities },
    { count: pendingLeaveCount },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("attendance_records")
      .select("status, overtime_minutes, late_minutes")
      .eq("work_date", todayIso),
    supabase
      .from("attendance_records")
      .select("work_date, status, late_minutes")
      .gte("work_date", seriesStartIso)
      .lte("work_date", todayIso),
    supabase
      .from("activity_logs")
      .select("id, action, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  // Also load both ranges lightly for toggle without remount flicker — fetch full month always for both charts
  const { data: monthRows } = await supabase
    .from("attendance_records")
    .select("work_date, status, late_minutes")
    .gte("work_date", isoDate(monthStart))
    .lte("work_date", todayIso);

  const present = (todayRows ?? []).filter((r) =>
    ["present", "late", "early_leave", "overtime", "incomplete"].includes(r.status),
  ).length;
  const late = (todayRows ?? []).filter(
    (r) => r.status === "late" || (r.late_minutes || 0) > 0,
  ).length;
  const onLeave = (todayRows ?? []).filter((r) => r.status === "on_leave").length;
  const otSum = (todayRows ?? []).reduce((s, r) => s + (r.overtime_minutes || 0), 0);
  const active = totalEmployees ?? 0;
  const absent = Math.max(active - present - onLeave, 0);

  const weekData = buildSeries(weekStart, 7, monthRows ?? seriesRows ?? []);
  const monthData = buildSeries(monthStart, monthDays, monthRows ?? []);

  const cards = [
    { label: ckb.totalEmployees, value: active },
    { label: ckb.present, value: present },
    { label: ckb.absent, value: absent },
    { label: ckb.late, value: late },
    { label: ckb.overtime, value: `${otSum} خولەک` },
    { label: "مۆڵەتی چاوەڕوان", value: pendingLeaveCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{ckb.dashboard}</h1>
        <p className="mt-1 text-sm text-ink-muted">{ckb.tagline}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="panel p-5">
            <p className="text-sm text-ink-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      <DashboardAttendanceSection
        weekData={weekData}
        monthData={monthData}
        range={range}
      />

      <div className="panel p-5">
        <h2 className="mb-4 text-lg font-semibold">{ckb.recentActivity}</h2>
        {(activities ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{ckb.noData}</p>
        ) : (
          <ul className="space-y-3">
            {activities!.map((a) => {
              const p = a.profiles as { full_name?: string } | null;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{p?.full_name || "سیستەم"}</p>
                    <p className="text-xs text-ink-muted" dir="ltr">
                      {a.action}
                    </p>
                  </div>
                  <p className="text-xs text-ink-muted" dir="ltr">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
