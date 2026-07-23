import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { Download } from "lucide-react";
import { ManualAttendanceForm } from "@/components/attendance/manual-attendance-form";
import { MarkAbsencesButton } from "@/components/attendance/mark-absences-button";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    present: "ئامادە",
    late: "دواکەوتوو",
    early_leave: "زوو ڕۆیشتوو",
    absent: "غائیب",
    on_leave: "مۆڵەت",
    incomplete: "ناتەواو",
    overtime: "کاتی زیادە",
  };
  return map[s] || s;
}

function clock(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; q?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const date =
    sp.date ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
      new Date(),
    );
  const q = (sp.q || "").trim();
  const view =
    sp.view === "absent" || sp.view === "all" || sp.view === "late"
      ? sp.view
      : "late";

  const supabase = await createClient();
  const [{ data: rows }, { data: employees }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select(
        "id, work_date, check_in_at, check_out_at, status, late_minutes, overtime_minutes, worked_minutes, employees(full_name, employee_code)",
      )
      .eq("work_date", date)
      .order("late_minutes", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name, employee_code")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const all = rows ?? [];
  const employeeList = employees ?? [];
  const lateRows = all.filter(
    (r) => (r.late_minutes || 0) > 0 || r.status === "late",
  );
  const absentRows = all.filter((r) => r.status === "absent");

  let filtered = view === "late" ? lateRows : view === "absent" ? absentRows : all;

  const qLower = q.toLowerCase();
  if (qLower) {
    filtered = filtered.filter((r) => {
      const emp = r.employees as
        | { full_name?: string; employee_code?: string }
        | null;
      const hay = `${emp?.full_name || ""} ${emp?.employee_code || ""}`.toLowerCase();
      return hay.includes(qLower);
    });
  }

  const pdfHref = `/api/attendance/late-pdf?date=${encodeURIComponent(date)}&view=${view}${
    q ? `&q=${encodeURIComponent(q)}` : ""
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{ckb.attendance}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            دواکەوتن و غەیب — گەڕان بە ناو یان ئایدی و داگرتنی PDF
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={pdfHref}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            <Download className="h-4 w-4" />
            داگرتنی لیستی PDF
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs text-ink-muted">کۆی تۆمار</p>
          <p className="mt-1 text-2xl font-bold">{all.length}</p>
        </div>
        <div className="panel border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs text-amber-800 dark:text-amber-200">دواکەوتوو</p>
          <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">
            {lateRows.length}
          </p>
        </div>
        <div className="panel border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-xs text-red-700 dark:text-red-200">غائیب</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-200">
            {absentRows.length}
          </p>
        </div>
      </div>

      <form className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="date">
            بەروار
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date}
            className="rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
            dir="ltr"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="q">
            گەڕان بە ناو یان ئایدی
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="ناو یان ١٠ ژمارەی ئایدی..."
            className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="view">
            جۆر
          </label>
          <select
            id="view"
            name="view"
            defaultValue={view}
            className="rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
          >
            <option value="late">تەنها دواکەوتوو</option>
            <option value="absent">تەنها غائیب</option>
            <option value="all">هەموو</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white"
        >
          پیشاندان
        </button>
      </form>

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">غائیبەکانی ڕۆژ</p>
          <p className="text-sm text-ink-muted">
            کارمەندانی بێ تۆمار وەک غائیب نیشانە بکە (پشوو و مۆڵەت جێدەهێڵدرێن)
          </p>
        </div>
        <MarkAbsencesButton date={date} />
      </div>

      <ManualAttendanceForm employees={employeeList} defaultDate={date} />

      {q ? (
        <p className="text-sm text-ink-muted">
          ئەنجامی گەڕان بۆ «{q}»:{" "}
          <span className="font-semibold text-brand-700">
            {filtered.length} کارمەند
          </span>
        </p>
      ) : null}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b border-line bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-right">#</th>
              <th className="px-4 py-3 text-right">کارمەند</th>
              <th className="px-4 py-3 text-right">ئایدی</th>
              <th className="px-4 py-3 text-right">چک-ئین</th>
              <th className="px-4 py-3 text-right">چک-ئاوت</th>
              <th className="px-4 py-3 text-right">دۆخ</th>
              <th className="px-4 py-3 text-right">دواکەوتن</th>
              <th className="px-4 py-3 text-right">کاتژمێر</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  {ckb.noData}
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => {
                const emp = r.employees as {
                  full_name?: string;
                  employee_code?: string;
                } | null;
                const isLate =
                  (r.late_minutes || 0) > 0 || r.status === "late";
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-line last:border-0 ${
                      isLate ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-ink-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{emp?.full_name}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {emp?.employee_code}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {clock(r.check_in_at)}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {clock(r.check_out_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          isLate
                            ? "rounded-md bg-amber-100 px-2 py-0.5 text-amber-900"
                            : r.status === "absent"
                              ? "rounded-md bg-red-100 px-2 py-0.5 text-red-800"
                              : ""
                        }
                      >
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-800">
                      {r.late_minutes || 0} خولەک
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {Math.floor((r.worked_minutes || 0) / 60)}:
                      {String((r.worked_minutes || 0) % 60).padStart(2, "0")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-muted">
        بۆ ڕاپۆرتی مەودا دار،{" "}
        <Link href="/reports" className="text-brand-700">
          بەشی ڕاپۆرت
        </Link>{" "}
        بەکاربهێنە.
      </p>
    </div>
  );
}
