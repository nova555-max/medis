import { HolidayCreateForm } from "@/components/org/holiday-create-form";
import { DeleteForm } from "@/components/org/delete-form";
import { deleteHolidayAction } from "@/lib/actions/org-phase2";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function HolidaysPage() {
  const supabase = await createClient();
  const { data: holidays } = await supabase
    .from("holidays")
    .select("id, name, holiday_date, is_recurring_yearly")
    .order("holiday_date", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.holidays}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          هەینی خۆکار پشووە. هەر ڕۆژێکی تر وەک پشوو، لێرە زیاد بکە
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="panel border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/20">
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
              پشووی هەفتانە: هەینی
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              هەموو هەینییەک خۆکار پشووە — پێویست ناکات تۆماری بکەیت. چک-ئین
              ناکرێت.
            </p>
          </div>
          <HolidayCreateForm />
        </div>

        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60">
              <tr>
                <th className="px-4 py-3 text-right">ناو</th>
                <th className="px-4 py-3 text-right">بەروار</th>
                <th className="px-4 py-3 text-right">ساڵانە</th>
                <th className="px-4 py-3 text-left">کردار</th>
              </tr>
            </thead>
            <tbody>
              {(holidays ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                    {ckb.noData}
                  </td>
                </tr>
              ) : (
                holidays!.map((h) => (
                  <tr key={h.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{h.name}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {h.holiday_date}
                    </td>
                    <td className="px-4 py-3">
                      {h.is_recurring_yearly ? "بەڵێ" : "نەخێر"}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <DeleteForm
                        label="سڕینەوە"
                        action={async () => {
                          "use server";
                          await deleteHolidayAction(h.id);
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
