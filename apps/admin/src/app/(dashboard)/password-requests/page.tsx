import { ResolvePasswordRequestForm } from "@/components/employees/resolve-password-request-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import Link from "next/link";

export default async function PasswordRequestsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("employee_password_reset_requests")
    .select(
      "id, status, requested_at, employees(full_name, employee_code, id)",
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">داواکاری وشەی نهێنی</h1>
        <p className="mt-1 text-sm text-ink-muted">
          کارمەند داوای گۆڕینی وشەی نهێنی دەکات — تۆ وشەی نوێی دادەنێیت و پێی دەڵێیت
        </p>
      </div>

      <div className="space-y-3">
        {(rows ?? []).length === 0 ? (
          <div className="panel p-8 text-center text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          rows!.map((r) => {
            const emp = r.employees as {
              full_name?: string;
              employee_code?: string;
              id?: string;
            } | null;
            const label = `${emp?.full_name || "کارمەند"} · ${emp?.employee_code || ""}`;
            return (
              <div key={r.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs text-ink-muted" dir="ltr">
                      {new Date(r.requested_at).toLocaleString()}
                    </p>
                  </div>
                  {emp?.id && (
                    <Link
                      href={`/employees/${emp.id}`}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      پرۆفایل
                    </Link>
                  )}
                </div>
                <ResolvePasswordRequestForm requestId={r.id} employeeLabel={label} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
