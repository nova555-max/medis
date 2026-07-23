import { LeaveReviewForm } from "@/components/leave/leave-review-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

const statusLabel: Record<string, string> = {
  pending: "چاوەڕوان",
  approved: "پەسەندکراو",
  rejected: "ڕەتکراوە",
  cancelled: "هەڵوەشاوە",
};

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status || "pending";
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("leave_requests")
    .select(
      "id, start_date, end_date, days_count, reason, status, review_note, created_at, employees(full_name, employee_code), leave_types(name_ckb)",
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.leave}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          پەسەندکردن یان ڕەتکردنەوەی داواکاری مۆڵەت بەپێی باڵانسی ڕۆژەکان
        </p>
      </div>

      <form className="panel flex gap-3 p-4">
        <select
          name="status"
          defaultValue={status}
          className="rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          <option value="pending">چاوەڕوان</option>
          <option value="approved">پەسەندکراو</option>
          <option value="rejected">ڕەتکراوە</option>
          <option value="cancelled">هەڵوەشاوە</option>
        </select>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white">
          فلتەر
        </button>
      </form>

      <div className="space-y-3">
        {(rows ?? []).length === 0 ? (
          <div className="panel p-8 text-center text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          rows!.map((r) => {
            const emp = r.employees as { full_name?: string; employee_code?: string } | null;
            const lt = r.leave_types as { name_ckb?: string } | null;
            const summary = `${lt?.name_ckb || "مۆڵەت"} · ${r.start_date} → ${r.end_date} (${r.days_count} ڕۆژ)`;

            if (status === "pending") {
              return (
                <LeaveReviewForm
                  key={r.id}
                  leaveId={r.id}
                  employeeName={emp?.full_name || "کارمەند"}
                  summary={summary}
                  reason={r.reason}
                />
              );
            }

            return (
              <div key={r.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{emp?.full_name}</p>
                    <p className="text-sm text-ink-muted">{summary}</p>
                    {r.reason && <p className="mt-2 text-sm">هۆکاری کارمەند: {r.reason}</p>}
                    {r.review_note && (
                      <p className="mt-2 text-sm text-ink-muted">
                        تێبینی ئەدمین: {r.review_note}
                      </p>
                    )}
                  </div>
                  <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium">
                    {statusLabel[r.status] || r.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
