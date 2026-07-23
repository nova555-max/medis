import Link from "next/link";
import { BigLiveClock } from "@/components/employee-app/big-clock";
import { EmployeeHomeActions } from "@/components/employee-app/home-actions";
import { WorkplaceMap } from "@/components/employee-app/workplace-map";
import { LiveLocationTracker } from "@/components/employee-app/online-location-tracker";
import { createClient } from "@/lib/supabase/server";
import { employeeLogoutAction } from "@/lib/actions/employee-app";
import { Button } from "@/components/ui/button";
import { ckb } from "@/lib/ckb";
import { formatMoney } from "@/lib/money";

export default async function EmployeeHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: emp } = await supabase
    .from("employees")
    .select(
      "id, company_id, employee_type, gps_enabled, gps_lat, gps_lng, gps_radius_meters, employee_code, base_salary, currency, departments(name)",
    )
    .eq("user_id", user!.id)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const [
    { data: record },
    { count: absentCount },
    { data: rewards },
    { count: unread },
    { data: company },
    { data: monthSalary },
  ] = await Promise.all([
    emp?.id
      ? supabase
          .from("attendance_records")
          .select("check_in_at, check_out_at, status, worked_minutes, late_minutes")
          .eq("employee_id", emp.id)
          .eq("work_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    emp?.id
      ? supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("employee_id", emp.id)
          .gte("work_date", monthStart)
          .eq("status", "absent")
      : Promise.resolve({ count: 0 }),
    emp?.id
      ? supabase
          .from("rewards")
          .select("id, title, amount, currency")
          .eq("employee_id", emp.id)
          .order("reward_date", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("is_read", false),
    emp?.company_id
      ? supabase
          .from("companies")
          .select("qr_required, selfie_required")
          .eq("id", emp.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    emp?.id
      ? supabase
          .from("salaries")
          .select("id, net_amount, currency, status, month, year")
          .eq("employee_id", emp.id)
          .in("status", ["paid", "approved"])
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const checkedIn = Boolean(record?.check_in_at);
  const checkedOut = Boolean(record?.check_out_at);
  const dept = emp?.departments as { name?: string } | null;
  const baseSalary = Number(
    (emp as { base_salary?: number } | null)?.base_salary || 0,
  );
  const empCurrency =
    (emp as { currency?: string } | null)?.currency || "IQD";
  const paidNet = monthSalary ? Number(monthSalary.net_amount || 0) : null;
  const paidCurrency =
    (monthSalary as { currency?: string } | null)?.currency || empCurrency;
  const isOnline =
    (emp as { employee_type?: string } | null)?.employee_type === "online";
  const officeGps = Boolean(emp?.gps_enabled) && !isOnline;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-ink-muted">سڵاو</p>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-sm text-ink-muted">
          {dept?.name || "—"} · {emp?.employee_code}
          {isOnline ? " · ئۆنلاین" : " · ئۆفیس"}
        </p>
      </div>

      <BigLiveClock />

      {isOnline ? <LiveLocationTracker mode="online" /> : null}
      {officeGps ? <LiveLocationTracker mode="office" /> : null}

      <Link
        href="/employee/salary"
        className="block rounded-[1.5rem] border border-brand-800/20 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-950 p-5 text-white shadow-soft"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-white/80">مووچەی من</p>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px]">
            {empCurrency === "USD" ? "دۆلار" : "دینار"}
          </span>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums" dir="ltr">
          {paidNet != null && paidNet > 0
            ? formatMoney(paidNet, paidCurrency)
            : baseSalary > 0
              ? formatMoney(baseSalary, empCurrency)
              : "—"}
        </p>
        <p className="mt-1.5 text-xs text-white/80">
          {paidNet != null && paidNet > 0
            ? `دوایین مووچە · ${monthSalary?.month}/${monthSalary?.year}`
            : baseSalary > 0
              ? "مووچەی بنەڕەتی"
              : "مووچە هێشتا دانەنراوە"}
          {" · "}بینینی وردەکاری
        </p>
      </Link>

      <EmployeeHomeActions
        checkedIn={checkedIn}
        checkedOut={checkedOut}
        gpsEnabled={Boolean(emp?.gps_enabled)}
        qrRequired={Boolean(company?.qr_required)}
        selfieRequired={Boolean(company?.selfie_required)}
      />

      <div className="panel px-4 py-3 text-center">
        <p className="text-sm text-ink-muted">دۆخی ئەمڕۆ</p>
        <p className="mt-0.5 text-base font-semibold">
          {!checkedIn
            ? "هێشتا دەستپێکی دەوامت نەکردووە"
            : checkedOut
              ? `تەواو · ${record?.worked_minutes || 0} خولەک`
              : "دەوام دەستی پێکردووە"}
        </p>
        {(record?.late_minutes || 0) > 0 && (
          <p className="mt-1 text-sm text-amber-700">
            دواکەوتن: {record?.late_minutes} خولەک
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-3 text-center">
          <p className="text-xs text-ink-muted">غیابی مانگ</p>
          <p className="mt-1 text-xl font-bold">{absentCount ?? 0}</p>
        </div>
        <div className="panel p-3 text-center">
          <p className="text-xs text-ink-muted">پاداشت</p>
          <p className="mt-1 text-xl font-bold">{rewards?.length ?? 0}</p>
        </div>
        <Link
          href="/employee/notifications"
          className="panel block p-3 text-center"
        >
          <p className="text-xs text-ink-muted">ئاگاداری</p>
          <p className="mt-1 text-xl font-bold">{unread ?? 0}</p>
        </Link>
      </div>

      {!isOnline ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{ckb.workplaceMap}</h2>
            <Link href="/employee/map" className="text-sm text-brand-700">
              گەورەتر
            </Link>
          </div>
          <WorkplaceMap
            enabled={Boolean(emp?.gps_enabled)}
            lat={emp?.gps_lat ?? null}
            lng={emp?.gps_lng ?? null}
            radius={emp?.gps_radius_meters ?? 150}
          />
          {officeGps ? (
            <p className="text-xs text-ink-muted">
              تەنها لەناو بازنەی {emp?.gps_radius_meters ?? 150} مەتر دەتوانیت
              هاتن یان چوون تۆمار بکەیت
            </p>
          ) : null}
        </div>
      ) : null}

      {(rewards ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">{ckb.rewards}</h2>
          {rewards!.map((r) => (
            <div
              key={r.id}
              className="panel flex items-center justify-between p-4"
            >
              <span>{r.title}</span>
              <span className="font-bold text-brand-700" dir="ltr">
                {formatMoney(
                  Number(r.amount),
                  (r as { currency?: string }).currency || empCurrency,
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/employee/salary"
          className="panel p-4 text-center font-medium"
        >
          نەخشەی مووچە
        </Link>
        <Link
          href="/employee/history"
          className="panel p-4 text-center font-medium"
        >
          مێژووی ئامادەبوون
        </Link>
        <Link
          href="/employee/leave"
          className="panel p-4 text-center font-medium"
        >
          مۆڵەت
        </Link>
        <Link
          href="/employee/profile"
          className="panel p-4 text-center font-medium"
        >
          زانیاری کەسی
        </Link>
      </div>

      <form action={employeeLogoutAction}>
        <Button type="submit" variant="ghost" className="w-full">
          {ckb.logout}
        </Button>
      </form>
    </div>
  );
}
