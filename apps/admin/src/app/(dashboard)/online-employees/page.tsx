import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LiveEmployeesMap } from "@/components/employees/online-employees-map";

function activityLabel(
  raw: string | null | undefined,
  type: string,
) {
  if (!raw) return "—";
  if (raw === "at_work") return "لە شوێنی کار";
  if (raw === "left_work") return "ڕۆیشتوو / دەرەوە";
  if (raw === "check_in") return "چک-ئین";
  if (raw === "check_out") return "چک-ئاوت";
  if (raw === "working") return "لە کاردا";
  if (raw === "meeting") return "کۆبوونەوە";
  if (raw === "break") return "پشوو";
  if (raw === "field") return "دەرەوە / سەردان";
  if (type === "office") return raw;
  return raw;
}

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default async function LiveEmployeesPage() {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, full_name, employee_code, phone, employee_type, gps_enabled, gps_lat, gps_lng, gps_radius_meters, last_lat, last_lng, last_location_at, last_activity",
    )
    .eq("status", "active")
    .or("employee_type.eq.online,gps_enabled.eq.true")
    .order("full_name");

  const list = employees ?? [];
  const withLoc = list.filter((e) => e.last_lat != null && e.last_lng != null);

  const points = withLoc.map((e) => {
    const type = e.employee_type || "office";
    let status = activityLabel(e.last_activity, type);
    if (
      type !== "online" &&
      e.gps_enabled &&
      e.gps_lat != null &&
      e.gps_lng != null &&
      e.last_lat != null &&
      e.last_lng != null
    ) {
      const dist = haversineM(
        Number(e.last_lat),
        Number(e.last_lng),
        Number(e.gps_lat),
        Number(e.gps_lng),
      );
      const inside = dist <= (e.gps_radius_meters || 150);
      status = inside
        ? `لە شوێنی کار · ${Math.round(dist)}م`
        : `ڕۆیشتوو · ${Math.round(dist)}م دوور`;
    }
    return {
      id: e.id,
      name: e.full_name,
      lat: Number(e.last_lat),
      lng: Number(e.last_lng),
      activity: status,
      kind: type === "online" ? "online" : "office",
    };
  });

  const atWorkCount = points.filter((p) =>
    p.activity.includes("لە شوێنی کار"),
  ).length;
  const awayCount = points.filter((p) => p.activity.includes("ڕۆیشتوو")).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">شوێنی ڕاستەوخۆ</h1>
          <p className="mt-1 text-sm text-ink-muted">
            کارمەندی ئۆفیس (GPS) و ئۆنلاین — ببینە لە شوێنی کارن یان ڕۆیشتوون
          </p>
        </div>
        <Link
          href="/employees"
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm"
        >
          کارمەندان
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs text-ink-muted">خاوەنی شوێن</p>
          <p className="mt-1 text-2xl font-bold">{withLoc.length}</p>
        </div>
        <div className="panel border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-xs text-emerald-800">لە شوێنی کار</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">
            {atWorkCount}
          </p>
        </div>
        <div className="panel border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs text-amber-800">ڕۆیشتوو / دەرەوە</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{awayCount}</p>
        </div>
      </div>

      <LiveEmployeesMap points={points} />

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-right">ناو</th>
              <th className="px-4 py-3 text-right">جۆر</th>
              <th className="px-4 py-3 text-right">دۆخ</th>
              <th className="px-4 py-3 text-right">کات</th>
              <th className="px-4 py-3 text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  هیچ کارمەندێکی شوێن-چالاک نییە — GPS بۆ ئۆفیس چالاک بکە یان
                  جۆری ئۆنلاین هەڵبژێرە
                </td>
              </tr>
            ) : (
              list.map((e) => {
                const type = e.employee_type || "office";
                const point = points.find((p) => p.id === e.id);
                return (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.full_name}</p>
                      <p className="text-xs text-ink-muted" dir="ltr">
                        {e.employee_code}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {type === "online" ? "ئۆنلاین" : "ئۆفیس"}
                    </td>
                    <td className="px-4 py-3">
                      {point?.activity ||
                        activityLabel(e.last_activity, type)}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {e.last_location_at
                        ? new Date(e.last_location_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/employees/${e.id}`}
                        className="text-brand-700"
                      >
                        وردەکاری
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
