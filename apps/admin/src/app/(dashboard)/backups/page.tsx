import { createBackupAction, restoreBackupAction } from "@/lib/actions/ops";
import { DeleteForm } from "@/components/org/delete-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function BackupsPage() {
  const supabase = await createClient();
  const { data: backups } = await supabase
    .from("backups")
    .select("id, status, triggered_by, size_bytes, storage_path, created_at, error_message")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.backups}</h1>
        <p className="mt-1 text-sm text-ink-muted">پاشەکەوتی دەستی داتای کۆمپانیا</p>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-ink-muted">
          پاشەکەوت کارمەند، ئامادەبوون، مۆڵەت، بەش و پۆست دەگرێتەوە. گەڕاندنەوە بەش،
          پۆست، ئامادەبوون و مۆڵەت دەگەڕێنێتەوە (کارمەند ناگۆڕدرێت).
        </p>
        <DeleteForm
          label="دروستکردنی پاشەکەوت ئێستا"
          action={async () => {
            "use server";
            await createBackupAction();
          }}
        />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-right">کات</th>
              <th className="px-4 py-3 text-right">جۆر</th>
              <th className="px-4 py-3 text-right">دۆخ</th>
              <th className="px-4 py-3 text-right">قەبارە</th>
              <th className="px-4 py-3 text-right">ڕێڕەو</th>
              <th className="px-4 py-3 text-right">کردار</th>
            </tr>
          </thead>
          <tbody>
            {(backups ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  {ckb.noData}
                </td>
              </tr>
            ) : (
              backups!.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3" dir="ltr">
                    {new Date(b.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{b.triggered_by}</td>
                  <td className="px-4 py-3">{b.status}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {b.size_bytes ? `${Math.round(b.size_bytes / 1024)} KB` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" dir="ltr">
                    {b.storage_path || b.error_message || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {b.status === "completed" && b.storage_path ? (
                      <DeleteForm
                        label="گەڕاندنەوە"
                        action={async () => {
                          "use server";
                          await restoreBackupAction(b.id);
                        }}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
