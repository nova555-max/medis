import Link from "next/link";
import { archiveEmployeeAction } from "@/lib/actions/org";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeInlineSalary } from "@/components/employees/employee-inline-salary";
import { WorkHoursPanel } from "@/components/employees/work-hours-panel";
import { DeleteForm } from "@/components/org/delete-form";
import { getAdminContext } from "@/lib/auth/session-context";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { formatMoney } from "@/lib/money";

function formatClock(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const status = sp.status === "archived" ? "archived" : "active";
  const typeFilter =
    sp.type === "online" || sp.type === "office" ? sp.type : "all";

  const supabase = await createClient();
  const ctx = await getAdminContext();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
  }).format(now);

  let query = supabase
    .from("employees")
    .select(
      "id, full_name, employee_code, email, phone, status, gps_enabled, employee_type, last_lat, last_lng, last_location_at, last_activity, base_salary, currency, photo_url, bound_device_id, bound_device_label, pending_device_id, departments(name)",
    )
    .eq("status", status)
    .order("full_name");

  if (typeFilter !== "all") {
    query = query.eq("employee_type", typeFilter);
  }

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,employee_code.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const [
    { data: employees },
    { data: departments },
    { data: monthSalaries },
    { data: todayAttendance },
    { data: company },
  ] = await Promise.all([
    query,
    supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("salaries")
      .select("employee_id, net_amount, currency, status")
      .eq("year", year)
      .eq("month", month),
    supabase
      .from("attendance_records")
      .select("employee_id, check_in_at, check_out_at, status")
      .eq("work_date", today),
    ctx?.companyId
      ? supabase
          .from("companies")
          .select(
            "work_start_time, work_end_time, late_grace_minutes, gps_only_during_work_hours",
          )
          .eq("id", ctx.companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const companyHours = {
    work_start_time: String(company?.work_start_time || "09:00"),
    work_end_time: String(company?.work_end_time || "17:00"),
    late_grace_minutes: company?.late_grace_minutes ?? 15,
    gps_only_during_work_hours:
      company?.gps_only_during_work_hours ?? true,
  };
  const salaryByEmp = new Map(
    (monthSalaries ?? []).map((s) => [s.employee_id, s]),
  );
  const attendanceByEmp = new Map(
    (todayAttendance ?? []).map((a) => [a.employee_id, a]),
  );
  const list = employees ?? [];
  const withSalary = list.filter(
    (e) => Number((e as { base_salary?: number }).base_salary || 0) > 0,
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{ckb.employees}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            یەک داشبۆرد — ناو، مووچە، کاتی هاتن و چوون
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-xl bg-surface-muted px-3 py-1.5">
            {list.length} کارمەند
          </span>
          <span className="rounded-xl bg-brand-50 px-3 py-1.5 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            {withSalary} مووچەیان هەیە
          </span>
        </div>
      </div>

      <WorkHoursPanel hours={companyHours} />

      <EmployeeForm departments={departments ?? []} />

      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            { key: "all", label: "هەموو" },
            { key: "office", label: "ئۆفیس" },
            { key: "online", label: "ئۆنلاین" },
          ] as const
        ).map((t) => {
          const href =
            t.key === "all"
              ? `/employees?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`
              : `/employees?status=${status}&type=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
          const active = typeFilter === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={`rounded-xl px-3 py-1.5 ${
                active
                  ? "bg-brand-600 text-white"
                  : "border border-line bg-surface-elevated"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        <Link
          href="/online-employees"
          className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-brand-800"
        >
          شوێنی ئۆنلاین
        </Link>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="type" value={typeFilter === "all" ? "" : typeFilter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="گەڕان: ناو، کۆد، ئیمەیڵ، مۆبایل..."
          className="flex-1 rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          <option value="active">چالاک</option>
          <option value="archived">ئەرشیف</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          گەڕان
        </button>
      </form>

      {list.length === 0 ? (
        <div className="panel px-4 py-12 text-center text-sm text-ink-muted">
          {ckb.noData}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((e) => {
            const dept = e.departments as { name?: string } | null;
            const base = Number(
              (e as { base_salary?: number }).base_salary || 0,
            );
            const currency = (e as { currency?: string }).currency || "IQD";
            const monthPay = salaryByEmp.get(e.id);
            const monthNet = monthPay ? Number(monthPay.net_amount || 0) : null;
            const att = attendanceByEmp.get(e.id);
            const empType =
              (e as { employee_type?: string }).employee_type || "office";
            const isOnline = empType === "online";

            return (
              <article
                key={e.id}
                className="panel grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center"
              >
                <div className="flex items-start gap-3">
                  {e.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.photo_url}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">
                      {e.full_name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold">
                        {e.full_name}
                      </h2>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                          isOnline
                            ? "bg-sky-100 text-sky-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isOnline ? "ئۆنلاین" : "ئۆفیس"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted" dir="ltr">
                      ئایدی: {e.employee_code}
                      {dept?.name ? ` · ${dept.name}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted" dir="ltr">
                      {e.phone || "—"}
                    </p>
                    <p className="mt-1.5 text-xs font-medium" dir="ltr">
                      <span className="text-ink-muted">ئەمڕۆ · هاتن:</span>{" "}
                      <span className="text-brand-700">
                        {formatClock(att?.check_in_at)}
                      </span>
                      {" · "}
                      <span className="text-ink-muted">چوون:</span>{" "}
                      <span className="text-brand-700">
                        {formatClock(att?.check_out_at)}
                      </span>
                    </p>
                    {isOnline ? (
                      <p className="mt-1 text-[11px] text-sky-800">
                        چالاکی:{" "}
                        {(e as { last_activity?: string | null }).last_activity ||
                          "—"}
                        {" · "}
                        شوێن:{" "}
                        {(e as { last_location_at?: string | null })
                          .last_location_at
                          ? new Date(
                              (e as { last_location_at: string })
                                .last_location_at,
                            ).toLocaleTimeString()
                          : "نەنێردراوە"}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-ink-muted">
                        GPS: {e.gps_enabled ? "چالاک" : "ناکارا"}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-ink-muted">
                      مۆبایل:{" "}
                      {(e as { bound_device_id?: string | null }).bound_device_id
                        ? (e as { bound_device_label?: string | null })
                            .bound_device_label || "بەستراو"
                        : "نەبەستراو"}
                      {(e as { pending_device_id?: string | null })
                        .pending_device_id ? (
                        <span className="mr-1 text-amber-700">
                          {" "}
                          · داواکاری نوێ
                        </span>
                      ) : null}
                      {monthNet != null ? (
                        <>
                          {" · "}کۆی ئەم مانگە:{" "}
                          <span
                            className="font-semibold text-brand-700"
                            dir="ltr"
                          >
                            {formatMoney(
                              monthNet,
                              (monthPay as { currency?: string })?.currency ||
                                currency,
                            )}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-ink-muted">
                    مووچەی بنەڕەتی
                    {base > 0 ? (
                      <span className="mr-2 text-brand-700" dir="ltr">
                        ({formatMoney(base, currency)})
                      </span>
                    ) : null}
                  </p>
                  <EmployeeInlineSalary
                    employeeId={e.id}
                    baseSalary={base}
                    currency={currency}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Link
                    href={`/employees/${e.id}`}
                    className="rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs font-medium"
                  >
                    دەستکاری / مۆبایل
                  </Link>
                  <Link
                    href={`/reports/employee/${e.id}`}
                    className="rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs font-medium"
                  >
                    ڕاپۆرت
                  </Link>
                  {status === "active" ? (
                    <DeleteForm
                      label={ckb.archive}
                      action={async () => {
                        "use server";
                        await archiveEmployeeAction(e.id);
                      }}
                    />
                  ) : (
                    <span className="text-xs text-ink-muted">ئەرشیفکراو</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
