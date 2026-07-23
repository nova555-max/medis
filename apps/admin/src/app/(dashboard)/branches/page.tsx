import { BranchCreateForm } from "@/components/org/branch-create-form";
import { DeleteForm } from "@/components/org/delete-form";
import { deleteBranchAction } from "@/lib/actions/org-phase2";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function BranchesPage() {
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, address, is_active, created_at")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.branches}</h1>
        <p className="mt-1 text-sm text-ink-muted">لق و ئۆفیسەکانی کۆمپانیا</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <BranchCreateForm />

        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60">
              <tr>
                <th className="px-4 py-3 text-right">ناو</th>
                <th className="px-4 py-3 text-right">ناونیشان</th>
                <th className="px-4 py-3 text-left">کردار</th>
              </tr>
            </thead>
            <tbody>
              {(branches ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-ink-muted">
                    {ckb.noData}
                  </td>
                </tr>
              ) : (
                branches!.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{b.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{b.address || "—"}</td>
                    <td className="px-4 py-3 text-left">
                      <DeleteForm
                        label="سڕینەوە"
                        action={async () => {
                          "use server";
                          await deleteBranchAction(b.id);
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
