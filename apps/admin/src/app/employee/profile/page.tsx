import { createClient } from "@/lib/supabase/server";
import { employeeLogoutAction } from "@/lib/actions/employee-app";
import { Button } from "@/components/ui/button";
import { ckb } from "@/lib/ckb";

export default async function EmployeeProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: emp } = await supabase
    .from("employees")
    .select(
      "employee_code, hire_date, status, gps_enabled, email, phone, departments(name)",
    )
    .eq("user_id", user!.id)
    .maybeSingle();

  const dept = emp?.departments as { name?: string } | null;

  const rows = [
    { label: "ناو", value: profile?.full_name },
    { label: "ئایدی", value: emp?.employee_code },
    { label: "مۆبایل", value: emp?.phone || profile?.phone || "—" },
    { label: "بەش", value: dept?.name || "—" },
    { label: "بەرواری دامەزراندن", value: emp?.hire_date || "—" },
    { label: "دۆخ", value: emp?.status },
    { label: "GPS", value: emp?.gps_enabled ? "چالاک" : "ناکارا / ئۆنلاین" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{ckb.profile}</h1>
        <p className="text-sm text-ink-muted">زانیاری کەسی — لەلایەن ئەدمینەوە بەڕێوەدەبرێت</p>
      </div>

      <div className="panel divide-y divide-line overflow-hidden">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-ink-muted">{r.label}</span>
            <span className="text-sm font-medium">{r.value || "—"}</span>
          </div>
        ))}
      </div>

      <form action={employeeLogoutAction}>
        <Button type="submit" variant="secondary" className="w-full">
          {ckb.logout}
        </Button>
      </form>
    </div>
  );
}
