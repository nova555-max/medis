import Link from "next/link";
import { GpsHistoryMapClient } from "@/components/attendance/gps-history-map-client";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import type { GpsPoint } from "@/components/attendance/gps-history-map";

export default async function GpsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; employeeId?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from || today.slice(0, 8) + "01";
  const to = sp.to || today;
  const employeeId = sp.employeeId || "";

  const supabase = await createClient();

  let query = supabase
    .from("attendance_records")
    .select(
      "id, work_date, check_in_lat, check_in_lng, check_out_lat, check_out_lng, employees(full_name, employee_code)",
    )
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: true });

  if (employeeId) query = query.eq("employee_id", employeeId);

  const [{ data: rows }, { data: employees }] = await Promise.all([
    query,
    supabase
      .from("employees")
      .select("id, full_name, employee_code")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const points: GpsPoint[] = [];
  for (const r of rows ?? []) {
    const emp = r.employees as { full_name?: string; employee_code?: string } | null;
    if (r.check_in_lat != null && r.check_in_lng != null) {
      points.push({
        id: `${r.id}-in`,
        work_date: r.work_date,
        kind: "in",
        lat: Number(r.check_in_lat),
        lng: Number(r.check_in_lng),
        name: emp?.full_name || "—",
        code: emp?.employee_code || "",
      });
    }
    if (r.check_out_lat != null && r.check_out_lng != null) {
      points.push({
        id: `${r.id}-out`,
        work_date: r.work_date,
        kind: "out",
        lat: Number(r.check_out_lat),
        lng: Number(r.check_out_lng),
        name: emp?.full_name || "—",
        code: emp?.employee_code || "",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.gpsHistory}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          شوێنی چک-ئین/ئاوتی کارمەندان لەسەر نەخشە
        </p>
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-sm" htmlFor="from">
            لە
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm"
            dir="ltr"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm" htmlFor="to">
            تا
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm"
            dir="ltr"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm" htmlFor="employeeId">
            کارمەند
          </label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={employeeId}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm"
          >
            <option value="">هەموو</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white">
            پیشاندان
          </button>
        </div>
      </form>

      <GpsHistoryMapClient points={points} />

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-right">بەروار</th>
              <th className="px-4 py-3 text-right">کارمەند</th>
              <th className="px-4 py-3 text-right">جۆر</th>
              <th className="px-4 py-3 text-right">lat</th>
              <th className="px-4 py-3 text-right">lng</th>
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  {ckb.noData}
                </td>
              </tr>
            ) : (
              points.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3" dir="ltr">
                    {p.work_date}
                  </td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{p.kind === "in" ? "ئین" : "ئاوت"}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {p.lat.toFixed(5)}
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    {p.lng.toFixed(5)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Link href="/reports" className="text-sm text-brand-700">
        گەڕانەوە بۆ ڕاپۆرت
      </Link>
    </div>
  );
}
