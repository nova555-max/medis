import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function EmployeeHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: rows } = emp?.id
    ? await supabase
        .from("attendance_records")
        .select("id, work_date, status, worked_minutes, late_minutes, check_in_at, check_out_at")
        .eq("employee_id", emp.id)
        .order("work_date", { ascending: false })
        .limit(40)
    : { data: [] };

  const statusLabel: Record<string, string> = {
    present: "ئامادە",
    late: "دواکەوتوو",
    absent: "غایب",
    leave: "مۆڵەت",
    half_day: "نیوەڕۆژ",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">مێژووی ئامادەبوون</h1>
        <p className="text-sm text-ink-muted">تۆماری ڕۆژانە — غیاب و دەوام</p>
      </div>

      <div className="space-y-2">
        {(rows ?? []).length === 0 ? (
          <div className="panel p-6 text-center text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          rows!.map((r) => (
            <div key={r.id} className="panel p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold" dir="ltr">
                  {r.work_date}
                </p>
                <span className="rounded-lg bg-surface-muted px-2 py-1 text-xs">
                  {statusLabel[r.status] || r.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {r.worked_minutes || 0} خولەک · دواکەوتن {r.late_minutes || 0}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
