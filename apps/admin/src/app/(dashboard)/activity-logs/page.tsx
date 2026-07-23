import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function ActivityLogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, metadata, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.activityLogs}</h1>
        <p className="mt-1 text-sm text-ink-muted">تۆماری چالاکییەکانی سیستەم</p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-right">کات</th>
              <th className="px-4 py-3 text-right">کەس</th>
              <th className="px-4 py-3 text-right">کردار</th>
              <th className="px-4 py-3 text-right">جۆر</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  {ckb.noData}
                </td>
              </tr>
            ) : (
              logs!.map((l) => {
                const p = l.profiles as { full_name?: string } | null;
                return (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3" dir="ltr">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{p?.full_name || "—"}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {l.action}
                    </td>
                    <td className="px-4 py-3">{l.entity_type || "—"}</td>
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
