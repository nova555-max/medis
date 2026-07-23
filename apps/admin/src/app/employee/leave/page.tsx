import { EmployeeLeaveForm } from "@/components/employee-app/leave-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

const statusLabel: Record<string, string> = {
  pending: "چاوەڕوان",
  approved: "پەسەندکراو",
  rejected: "ڕەتکراوە",
  cancelled: "هەڵوەشاوە",
};

export default async function EmployeeLeavePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: emp } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const year = new Date().getFullYear();

  if (emp) {
    await supabase.rpc("ensure_leave_balances", {
      p_employee_id: emp.id,
      p_year: year,
    });
  }

  const [{ data: types }, { data: rows }, { data: balances }] = await Promise.all([
    emp
      ? supabase
          .from("leave_types")
          .select("id, name_ckb, annual_allowance_days")
          .eq("company_id", emp.company_id)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    emp
      ? supabase
          .from("leave_requests")
          .select(
            "id, start_date, end_date, status, days_count, reason, review_note, leave_types(name_ckb)",
          )
          .eq("employee_id", emp.id)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    emp
      ? supabase
          .from("leave_balances")
          .select(
            "entitled_days, used_days, remaining_days, leave_type_id, leave_types(name_ckb)",
          )
          .eq("employee_id", emp.id)
          .eq("year", year)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{ckb.leave}</h1>
        <p className="text-sm text-ink-muted">
          باڵانسی ساڵی {year} — داواکاری لەلایەن ئەدمینەوە پەسەند دەکرێت
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(balances ?? []).length === 0 ? (
          <div className="panel p-4 text-sm text-ink-muted sm:col-span-2">
            باڵانسی مۆڵەت هێشتا ئامادە نییە
          </div>
        ) : (
          balances!.map((b, i) => {
            const lt = b.leave_types as { name_ckb?: string } | null;
            return (
              <div key={i} className="panel p-4">
                <p className="text-sm text-ink-muted">{lt?.name_ckb || "مۆڵەت"}</p>
                <p className="mt-1 text-lg font-bold">
                  ماوە: {Number(b.remaining_days)} ڕۆژ
                </p>
                <p className="text-xs text-ink-muted">
                  بەکارهاتوو {Number(b.used_days)} لە {Number(b.entitled_days)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <EmployeeLeaveForm types={types ?? []} />

      <div className="space-y-2">
        <h2 className="font-semibold">مێژوو</h2>
        {(rows ?? []).length === 0 ? (
          <div className="panel p-6 text-center text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          rows!.map((r) => {
            const lt = r.leave_types as { name_ckb?: string } | null;
            return (
              <div key={r.id} className="panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{lt?.name_ckb || ckb.leave}</p>
                  <span className="rounded-lg bg-surface-muted px-2 py-1 text-xs">
                    {statusLabel[r.status] || r.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {r.start_date} → {r.end_date} · {r.days_count} ڕۆژ
                </p>
                {r.reason && <p className="mt-2 text-sm">هۆکار: {r.reason}</p>}
                {r.review_note && (
                  <p className="mt-1 text-sm text-ink-muted">تێبینی ئەدمین: {r.review_note}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
