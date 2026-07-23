import Link from "next/link";
import { ReportShell } from "@/components/reports/report-shell";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createClient } from "@/lib/supabase/server";
import { minsToHours } from "@/lib/reports/types";
import { ckb } from "@/lib/ckb";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    type?: string;
    employeeId?: string;
    departmentId?: string;
  }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const type = sp.type || "daily";

  let from = sp.from || today;
  let to = sp.to || today;
  if (!sp.from && !sp.to) {
    if (type === "monthly" || type === "department") {
      from = today.slice(0, 8) + "01";
      to = today;
    } else if (type === "yearly") {
      from = `${today.slice(0, 4)}-01-01`;
      to = today;
    } else if (type === "daily") {
      from = today;
      to = today;
    } else {
      from = today.slice(0, 8) + "01";
      to = today;
    }
  }

  const { brand, generatedBy } = await loadCompanyBrand();
  const supabase = await createClient();

  const [{ data: attendance }, { data: employees }, { data: departments }] =
    await Promise.all([
      supabase
        .from("attendance_records")
        .select(
          "work_date, status, late_minutes, overtime_minutes, worked_minutes, employee_id, employees(full_name, employee_code, department_id, departments(name), branches(name))",
        )
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false }),
      supabase
        .from("employees")
        .select("id, full_name")
        .eq("status", "active")
        .order("full_name"),
      supabase.from("departments").select("id, name").order("name"),
    ]);

  let filtered = attendance ?? [];
  if (sp.employeeId) {
    filtered = filtered.filter((a) => a.employee_id === sp.employeeId);
  }
  if (sp.departmentId) {
    filtered = filtered.filter((a) => {
      const emp = a.employees as { department_id?: string } | null;
      return emp?.department_id === sp.departmentId;
    });
  }
  if (type === "late") {
    filtered = filtered.filter(
      (a) => (a.late_minutes || 0) > 0 || a.status === "late",
    );
  } else if (type === "absence") {
    filtered = filtered.filter((a) => a.status === "absent");
  }

  const lateCount = filtered.filter(
    (a) => (a.late_minutes || 0) > 0 || a.status === "late",
  ).length;
  const absentCount = filtered.filter((a) => a.status === "absent").length;
  const workedSum = filtered.reduce((s, a) => s + (a.worked_minutes || 0), 0);
  const otSum = filtered.reduce((s, a) => s + (a.overtime_minutes || 0), 0);

  const q = new URLSearchParams({
    from,
    to,
    type,
    ...(sp.employeeId ? { employeeId: sp.employeeId } : {}),
    ...(sp.departmentId ? { departmentId: sp.departmentId } : {}),
  });
  const exportXlsx = `/api/reports/export?${q}&format=xlsx`;
  const exportPdf = `/api/reports/export?${q}&format=pdf`;

  const titles: Record<string, string> = {
    daily: "ڕاپۆرتی ئامادەبوونی ڕۆژانە",
    monthly: "ڕاپۆرتی ئامادەبوونی مانگانە",
    yearly: "ڕاپۆرتی ئامادەبوونی ساڵانە",
    absence: "ڕاپۆرتی غیاب",
    late: "ڕاپۆرتی دواکەوتن",
    employee: "ڕاپۆرتی ئامادەبوونی کارمەند",
    department: "ڕاپۆرتی ئامادەبوونی بەش",
  };

  const meta = buildMeta(
    titles[type] || ckb.reports,
    "ATT",
    generatedBy || "Admin",
    { from, to },
  );

  if (!brand) {
    return (
      <div className="panel p-8 text-center text-sm text-ink-muted">
        تکایە وەک ئەدمین بچۆ ژوورەوە
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form className="panel grid gap-3 p-4 print:hidden md:grid-cols-6">
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
          <label className="mb-1.5 block text-sm" htmlFor="type">
            جۆر
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm"
          >
            <option value="daily">ڕۆژانە</option>
            <option value="monthly">مانگانە</option>
            <option value="yearly">ساڵانە</option>
            <option value="employee">کارمەند</option>
            <option value="department">بەش</option>
            <option value="absence">غیاب</option>
            <option value="late">دواکەوتن</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm" htmlFor="employeeId">
            کارمەند
          </label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={sp.employeeId || ""}
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
        <div>
          <label className="mb-1.5 block text-sm" htmlFor="departmentId">
            بەش
          </label>
          <select
            id="departmentId"
            name="departmentId"
            defaultValue={sp.departmentId || ""}
            className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm"
          >
            <option value="">هەموو</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white"
          >
            پیشاندان
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Link
          href="/reports/employee"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2 text-sm"
        >
          ڕاپۆرتی تەواوی کارمەند
        </Link>
        <Link
          href="/gps-history"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2 text-sm"
        >
          {ckb.gpsHistory}
        </Link>
      </div>

      <ReportShell
        brand={brand}
        meta={meta}
        actions={
          <>
            <Link
              href={exportPdf}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white"
            >
              داگرتنی PDF
            </Link>
            <Link
              href={exportXlsx}
              className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm"
            >
              داگرتنی Excel
            </Link>
          </>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">کۆی تۆمار</p>
            <p className="text-xl font-bold">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">کاتی کارکردن</p>
            <p className="text-xl font-bold" dir="ltr">
              {minsToHours(workedSum)}
            </p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">دواکەوتن</p>
            <p className="text-xl font-bold">{lateCount}</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs text-ink-muted">غیاب / زیادە</p>
            <p className="text-xl font-bold">
              {absentCount} / {minsToHours(otSum)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="report-table min-w-[900px]">
            <thead>
              <tr>
                <th>بەروار</th>
                <th>کارمەند</th>
                <th>کۆد</th>
                <th>بەش</th>
                <th>لق</th>
                <th>دۆخ</th>
                <th>دواکەوتن</th>
                <th>کارکردن</th>
                <th>زیادە</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const emp = a.employees as {
                  full_name?: string;
                  employee_code?: string;
                  departments?: { name?: string } | null;
                  branches?: { name?: string } | null;
                } | null;
                return (
                  <tr key={`${a.work_date}-${a.employee_id}-${idx}`}>
                    <td dir="ltr">{a.work_date}</td>
                    <td>{emp?.full_name}</td>
                    <td dir="ltr">{emp?.employee_code}</td>
                    <td>{emp?.departments?.name || "—"}</td>
                    <td>{emp?.branches?.name || "—"}</td>
                    <td>{a.status}</td>
                    <td>{a.late_minutes || 0}</td>
                    <td dir="ltr">{minsToHours(a.worked_minutes || 0)}</td>
                    <td dir="ltr">{minsToHours(a.overtime_minutes || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-muted">{ckb.noData}</p>
          )}
        </div>
      </ReportShell>
    </div>
  );
}
