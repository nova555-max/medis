import { ShiftCreateForm } from "@/components/org/shift-create-form";
import { DeleteForm } from "@/components/org/delete-form";
import { deleteShiftAction } from "@/lib/actions/org-phase2";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function ShiftsPage() {
  const supabase = await createClient();
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time, late_grace_minutes")
    .order("start_time");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.shifts}</h1>
        <p className="mt-1 text-sm text-ink-muted">کاتەکانی دەوامی جیاواز</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ShiftCreateForm />

        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60">
              <tr>
                <th className="px-4 py-3 text-right">ناو</th>
                <th className="px-4 py-3 text-right">دەستپێک</th>
                <th className="px-4 py-3 text-right">کۆتایی</th>
                <th className="px-4 py-3 text-right">لێخۆشبوون</th>
                <th className="px-4 py-3 text-left">کردار</th>
              </tr>
            </thead>
            <tbody>
              {(shifts ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                    {ckb.noData}
                  </td>
                </tr>
              ) : (
                shifts!.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {String(s.start_time).slice(0, 5)}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {String(s.end_time).slice(0, 5)}
                    </td>
                    <td className="px-4 py-3">{s.late_grace_minutes} خولەک</td>
                    <td className="px-4 py-3 text-left">
                      <DeleteForm
                        label="سڕینەوە"
                        action={async () => {
                          "use server";
                          await deleteShiftAction(s.id);
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
