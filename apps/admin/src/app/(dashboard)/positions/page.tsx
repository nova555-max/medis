import {
  createPositionAction,
  deletePositionAction,
} from "@/lib/actions/org";
import { SimpleNameForm } from "@/components/org/simple-name-form";
import { DeleteForm } from "@/components/org/delete-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function PositionsPage() {
  const supabase = await createClient();
  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, is_active, created_at")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.positions}</h1>
        <p className="mt-1 text-sm text-ink-muted">پۆستەکانی کار بەڕێوەببە</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <SimpleNameForm
          action={createPositionAction}
          label="ناوی پۆست"
          placeholder="بۆ نموونە: ژمێریار"
        />

        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60">
              <tr>
                <th className="px-4 py-3 text-right font-medium">ناو</th>
                <th className="px-4 py-3 text-left font-medium">کردار</th>
              </tr>
            </thead>
            <tbody>
              {(positions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-ink-muted">
                    {ckb.noData}
                  </td>
                </tr>
              ) : (
                positions!.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-left">
                      <DeleteForm
                        label="سڕینەوە"
                        action={async () => {
                          "use server";
                          await deletePositionAction(p.id);
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
