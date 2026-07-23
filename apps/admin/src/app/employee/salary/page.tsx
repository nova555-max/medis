import { SalaryChart } from "@/components/employee-app/salary-chart";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { formatMoney } from "@/lib/money";

const MONTH_CKB = [
  "",
  "کانوونی دووەم",
  "شوبات",
  "ئازار",
  "نیسان",
  "ئایار",
  "حوزەیران",
  "تەممووز",
  "ئاب",
  "ئەیلوول",
  "تشرینی یەکەم",
  "تشرینی دووەم",
  "کانوونی یەکەم",
];

function statusLabel(status: string) {
  if (status === "paid") return "گەیشتووە";
  if (status === "approved") return "پەسەندکراو";
  if (status === "draft") return "ڕەشنووس";
  return status;
}

export default async function EmployeeSalaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: emp } = await supabase
    .from("employees")
    .select("id, base_salary, currency")
    .eq("user_id", user!.id)
    .maybeSingle();

  const empCurrency = (emp as { currency?: string } | null)?.currency || "IQD";
  const baseSalary = Number((emp as { base_salary?: number } | null)?.base_salary || 0);

  const [{ data: salaries }, { data: rewards }, { count: absences }] = await Promise.all([
    emp
      ? supabase
          .from("salaries")
          .select(
            "id, year, month, base_amount, allowances, deductions, net_amount, status, paid_at, currency",
          )
          .eq("employee_id", emp.id)
          .in("status", ["paid", "approved"])
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    emp
      ? supabase
          .from("rewards")
          .select("id, title, amount, reward_date, note, currency")
          .eq("employee_id", emp.id)
          .order("reward_date", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    emp
      ? supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("employee_id", emp.id)
          .eq("status", "absent")
      : Promise.resolve({ count: 0 }),
  ]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const rows = salaries ?? [];
  const thisMonth = rows.find((s) => s.year === currentYear && s.month === currentMonth);
  const featured = thisMonth ?? rows[0] ?? null;
  const showingPrevious = Boolean(featured && !thisMonth);
  const featuredCurrency =
    (featured as { currency?: string } | null)?.currency || empCurrency;

  const chartData = [...rows].reverse().map((s) => ({
    label: `${s.month}/${String(s.year).slice(2)}`,
    net: Number(s.net_amount) || 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{ckb.salary}</h1>
        <p className="text-sm text-ink-muted">
          مووچەی مانگی ڕابردوو دەبینیت هەتا ئەدمین مووچەی مانگی نوێ دادەنێت
        </p>
      </div>

      {baseSalary > 0 && (
        <div className="panel flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-ink-muted">مووچەی بنەڕەتی</p>
            <p className="mt-0.5 text-lg font-bold text-brand-700" dir="ltr">
              {formatMoney(baseSalary, empCurrency)}
            </p>
          </div>
          <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium">
            {empCurrency === "USD" ? "دۆلار ($)" : "دینار (IQD)"}
          </span>
        </div>
      )}

      {featured ? (
        <div className="rounded-[1.75rem] border border-brand-800/20 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-950 p-6 text-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white/80">
              {showingPrevious ? "مووچەی مانگی ڕابردوو" : "مووچەی ئەم مانگە"}
            </p>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90">
              {statusLabel(featured.status)} ·{" "}
              {featuredCurrency === "USD" ? "USD" : "IQD"}
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold tabular-nums" dir="ltr">
            {formatMoney(Number(featured.net_amount), featuredCurrency)}
          </p>
          <p className="mt-2 text-sm text-white/85">
            {MONTH_CKB[featured.month] || featured.month} · {featured.year}
          </p>
          {showingPrevious && (
            <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/90">
              مووچەی مانگی {MONTH_CKB[currentMonth]} هێشتا دانەنراوە — دوای دانان لێرە دەردەکەوێت
            </p>
          )}
        </div>
      ) : (
        <div className="panel p-6 text-center text-sm text-ink-muted">
          هێشتا هیچ مووچەیەک تۆمار نەکراوە
        </div>
      )}

      <SalaryChart data={chartData} />

      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4 text-center">
          <p className="text-xs text-ink-muted">کۆی غیاب</p>
          <p className="mt-1 text-2xl font-bold">{absences ?? 0}</p>
        </div>
        <div className="panel p-4 text-center">
          <p className="text-xs text-ink-muted">پاداشت</p>
          <p className="mt-1 text-2xl font-bold">{rewards?.length ?? 0}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">مێژووی مووچە</h2>
        {rows.length === 0 ? (
          <div className="panel p-6 text-center text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          rows.map((s) => {
            const isActiveMonth = s.year === currentYear && s.month === currentMonth;
            const cur = (s as { currency?: string }).currency || empCurrency;
            return (
              <div
                key={s.id}
                className={`panel p-4 ${isActiveMonth ? "border-brand-300 ring-1 ring-brand-200" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {MONTH_CKB[s.month] || s.month} {s.year}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {statusLabel(s.status)} · {cur === "USD" ? "دۆلار" : "دینار"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-bold text-brand-700" dir="ltr">
                      {formatMoney(Number(s.net_amount), cur)}
                    </p>
                    <Link
                      href={`/employee/salary/receipt/${s.id}`}
                      className="text-xs font-medium text-brand-700"
                    >
                      بینینی وەسڵ
                    </Link>
                  </div>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  بنەڕەت {formatMoney(Number(s.base_amount), cur)} · زیادکراو{" "}
                  {formatMoney(Number(s.allowances), cur)} · کەمکردنەوە{" "}
                  {formatMoney(Number(s.deductions), cur)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">{ckb.rewards}</h2>
        {(rewards ?? []).length === 0 ? (
          <div className="panel p-6 text-center text-sm text-ink-muted">هیچ پاداشتێک نییە</div>
        ) : (
          rewards!.map((r) => (
            <div key={r.id} className="panel flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-ink-muted">{r.reward_date}</p>
              </div>
              <p className="font-bold text-brand-700" dir="ltr">
                {formatMoney(
                  Number(r.amount),
                  (r as { currency?: string }).currency || empCurrency,
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
