import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function EmployeeReportPickerPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, employee_code, departments(name)")
    .eq("status", "active")
    .order("full_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">ڕاپۆرتی کارمەند</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ڕاپۆرتی تەواو لەگەڵ پوختەی ئامادەبوون و مۆڵەت
        </p>
      </div>

      <div className="panel divide-y divide-line">
        {(employees ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">{ckb.noData}</p>
        ) : (
          employees!.map((e) => {
            const dept = e.departments as { name?: string } | null;
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{e.full_name}</p>
                  <p className="text-xs text-ink-muted">
                    {e.employee_code} · {dept?.name || "—"}
                  </p>
                </div>
                <Link
                  href={`/reports/employee/${e.id}?from=${monthStart}&to=${today}`}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white"
                >
                  کردنەوە
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
