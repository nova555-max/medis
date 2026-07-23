import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportShell } from "@/components/reports/report-shell";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createClient } from "@/lib/supabase/server";
import { minsToHours } from "@/lib/reports/types";
import { ckb } from "@/lib/ckb";

export default async function EmployeeReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from || today.slice(0, 8) + "01";
  const to = sp.to || today;

  const { brand, generatedBy } = await loadCompanyBrand();
  if (!brand) notFound();

  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select(
      "id, full_name, employee_code, email, phone, hire_date, photo_url, departments(name), positions(name), branches(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!emp) notFound();

  const [{ data: attendance }, { data: leaves }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("work_date, status, late_minutes, overtime_minutes, worked_minutes")
      .eq("employee_id", id)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("start_date, end_date, days_count, status, leave_types(name_ckb)")
      .eq("employee_id", id)
      .order("start_date", { ascending: false })
      .limit(20),
  ]);

  const rows = attendance ?? [];
  const totalWorked = rows.reduce((s, r) => s + (r.worked_minutes || 0), 0);
  const totalOt = rows.reduce((s, r) => s + (r.overtime_minutes || 0), 0);
  const lateCount = rows.filter(
    (r) => (r.late_minutes || 0) > 0 || r.status === "late",
  ).length;
  const absentCount = rows.filter((r) => r.status === "absent").length;
  const leaveApproved = (leaves ?? []).filter((l) => l.status === "approved");
  const leaveDays = leaveApproved.reduce(
    (s, l) => s + Number(l.days_count || 0),
    0,
  );

  const dept = emp.departments as { name?: string } | null;
  const pos = emp.positions as { name?: string } | null;
  const branch = emp.branches as { name?: string } | null;

  const meta = buildMeta(
    `ڕاپۆرتی کارمەند — ${emp.full_name}`,
    "EMP",
    generatedBy,
    { from, to },
  );

  const pdfUrl = `/api/reports/employee?employeeId=${id}&from=${from}&to=${to}&format=pdf`;
  const xlsxUrl = `/api/reports/employee?employeeId=${id}&from=${from}&to=${to}&format=xlsx`;

  return (
    <div className="space-y-4">
      <form method="get" className="panel flex flex-wrap gap-3 p-4 print:hidden">
        <input
          name="from"
          type="date"
          defaultValue={from}
          className="rounded-xl border border-line px-3 py-2 text-sm"
          dir="ltr"
        />
        <input
          name="to"
          type="date"
          defaultValue={to}
          className="rounded-xl border border-line px-3 py-2 text-sm"
          dir="ltr"
        />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white">
          نوێکردنەوە
        </button>
        <Link href="/reports/employee" className="rounded-xl border border-line px-4 py-2 text-sm">
          گەڕانەوە
        </Link>
      </form>

      <ReportShell
        brand={brand}
        meta={meta}
        actions={
          <>
            <Link href={pdfUrl} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white">
              داگرتنی PDF
            </Link>
            <Link
              href={xlsxUrl}
              className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm"
            >
              داگرتنی Excel
            </Link>
          </>
        }
      >
        <div className="mb-6 flex flex-wrap items-start gap-5">
          {emp.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={emp.photo_url}
              alt={emp.full_name}
              className="h-24 w-24 rounded-2xl border border-line object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-700">
              {emp.full_name.slice(0, 1)}
            </div>
          )}
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <p>
              <span className="text-ink-muted">ناو: </span>
              {emp.full_name}
            </p>
            <p>
              <span className="text-ink-muted">کۆد: </span>
              <span dir="ltr">{emp.employee_code}</span>
            </p>
            <p>
              <span className="text-ink-muted">ناسنامە: </span>
              <span dir="ltr" className="text-xs">
                {emp.id}
              </span>
            </p>
            <p>
              <span className="text-ink-muted">بەش: </span>
              {dept?.name || "—"}
            </p>
            <p>
              <span className="text-ink-muted">پۆست: </span>
              {pos?.name || "—"}
            </p>
            <p>
              <span className="text-ink-muted">لق: </span>
              {branch?.name || "—"}
            </p>
            <p>
              <span className="text-ink-muted">بەرواری دامەزراندن: </span>
              <span dir="ltr">{emp.hire_date || "—"}</span>
            </p>
            <p>
              <span className="text-ink-muted">تەلەفۆن: </span>
              <span dir="ltr">{emp.phone || "—"}</span>
            </p>
            <p>
              <span className="text-ink-muted">ئیمەیڵ: </span>
              <span dir="ltr">{emp.email || "—"}</span>
            </p>
          </div>
        </div>

        <h3 className="mb-3 font-semibold">پوختەی ئامادەبوون</h3>
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">کۆی کاتی کار</p>
            <p className="text-lg font-bold" dir="ltr">
              {minsToHours(totalWorked)}
            </p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">کاتی زیادە</p>
            <p className="text-lg font-bold" dir="ltr">
              {minsToHours(totalOt)}
            </p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">ژمارەی دواکەوتن</p>
            <p className="text-lg font-bold">{lateCount}</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">غیاب / مۆڵەت</p>
            <p className="text-lg font-bold">
              {absentCount} / {leaveDays}
            </p>
          </div>
        </div>

        <h3 className="mb-3 font-semibold">پوختەی مۆڵەت</h3>
        <div className="mb-6 overflow-x-auto">
          <table className="report-table">
            <thead>
              <tr>
                <th>جۆر</th>
                <th>لە</th>
                <th>تا</th>
                <th>ڕۆژ</th>
                <th>دۆخ</th>
              </tr>
            </thead>
            <tbody>
              {(leaves ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-ink-muted">
                    {ckb.noData}
                  </td>
                </tr>
              ) : (
                leaves!.map((l, i) => {
                  const lt = l.leave_types as { name_ckb?: string } | null;
                  return (
                    <tr key={i}>
                      <td>{lt?.name_ckb || "—"}</td>
                      <td dir="ltr">{l.start_date}</td>
                      <td dir="ltr">{l.end_date}</td>
                      <td>{l.days_count}</td>
                      <td>{l.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <h3 className="mb-3 font-semibold">تۆماری ئامادەبوون</h3>
        <div className="overflow-x-auto">
          <table className="report-table min-w-[700px]">
            <thead>
              <tr>
                <th>بەروار</th>
                <th>دۆخ</th>
                <th>دواکەوتن</th>
                <th>کارکردن</th>
                <th>زیادە</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.work_date}>
                  <td dir="ltr">{r.work_date}</td>
                  <td>{r.status}</td>
                  <td>{r.late_minutes || 0}</td>
                  <td dir="ltr">{minsToHours(r.worked_minutes || 0)}</td>
                  <td dir="ltr">{minsToHours(r.overtime_minutes || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportShell>
    </div>
  );
}
