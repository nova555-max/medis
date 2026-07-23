import Link from "next/link";
import { notFound } from "next/navigation";
import { EmployeeGpsForm } from "@/components/employees/employee-gps-form";
import { EmployeeDocuments } from "@/components/employees/employee-documents";
import { EmployeeOrgAssign } from "@/components/employees/employee-org-assign";
import { EmployeeEditPanel } from "@/components/employees/employee-edit-panel";
import { LeaveBalancesPanel } from "@/components/employees/leave-balances-panel";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { formatMoney } from "@/lib/money";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const { data: employee } = await supabase
    .from("employees")
    .select(
      "id, full_name, employee_code, email, phone, company_id, department_id, shift_id, employee_type, gps_enabled, gps_lat, gps_lng, gps_radius_meters, last_lat, last_lng, last_location_at, last_activity, base_salary, currency, bound_device_id, bound_device_label, bound_device_at, pending_device_id, pending_device_label, pending_device_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!employee) notFound();

  const baseSalary = Number(
    (employee as { base_salary?: number }).base_salary || 0,
  );
  const currency = (employee as { currency?: string }).currency || "IQD";

  const [
    { data: documents },
    { data: balances },
    { data: leaveTypes },
    { data: shifts },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from("employee_documents")
      .select("id, title, file_path, file_type, file_size, created_at")
      .eq("employee_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("leave_balances")
      .select(
        "id, leave_type_id, year, entitled_days, used_days, remaining_days, leave_types(name_ckb)",
      )
      .eq("employee_id", id)
      .eq("year", year),
    supabase
      .from("leave_types")
      .select("id, name_ckb")
      .eq("company_id", employee.company_id)
      .eq("is_active", true)
      .order("name_ckb"),
    supabase
      .from("shifts")
      .select("id, name")
      .eq("company_id", employee.company_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", employee.company_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const balanceRows = (balances ?? []).map((b) => {
    const lt = b.leave_types as { name_ckb?: string } | null;
    return {
      id: b.id,
      leave_type_id: b.leave_type_id,
      name_ckb: lt?.name_ckb || "مۆڵەت",
      year: b.year,
      entitled_days: Number(b.entitled_days),
      used_days: Number(b.used_days),
      remaining_days: Number(b.remaining_days),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/employees" className="text-sm text-brand-700">
            ← گەڕانەوە بۆ داشبۆردی کارمەندان
          </Link>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            {employee.full_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted" dir="ltr">
            ئایدی: {employee.employee_code} · مووچە:{" "}
            {baseSalary > 0 ? formatMoney(baseSalary, currency) : "—"}
          </p>
        </div>
        <Link
          href="/employees"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2 text-sm"
        >
          {ckb.employees}
        </Link>
      </div>

      <EmployeeEditPanel
        employee={{
          id: employee.id,
          full_name: employee.full_name,
          employee_code: employee.employee_code,
          phone: employee.phone,
          department_id: employee.department_id,
          base_salary: baseSalary,
          currency,
          employee_type:
            ((employee as { employee_type?: string }).employee_type as
              | "office"
              | "online") || "office",
          bound_device_id:
            (employee as { bound_device_id?: string | null }).bound_device_id ||
            null,
          bound_device_label:
            (employee as { bound_device_label?: string | null })
              .bound_device_label || null,
          bound_device_at:
            (employee as { bound_device_at?: string | null }).bound_device_at ||
            null,
          pending_device_id:
            (employee as { pending_device_id?: string | null })
              .pending_device_id || null,
          pending_device_label:
            (employee as { pending_device_label?: string | null })
              .pending_device_label || null,
          pending_device_at:
            (employee as { pending_device_at?: string | null })
              .pending_device_at || null,
        }}
        departments={departments ?? []}
      />

      <EmployeeOrgAssign
        employeeId={employee.id}
        shiftId={employee.shift_id}
        shifts={shifts ?? []}
      />

      <EmployeeGpsForm
        employee={{
          id: employee.id,
          full_name: employee.full_name,
          employee_type:
            ((employee as { employee_type?: string }).employee_type as
              | "office"
              | "online") || "office",
          gps_enabled: employee.gps_enabled ?? false,
          gps_lat: employee.gps_lat,
          gps_lng: employee.gps_lng,
          gps_radius_meters: employee.gps_radius_meters ?? 150,
          last_lat: (employee as { last_lat?: number | null }).last_lat ?? null,
          last_lng: (employee as { last_lng?: number | null }).last_lng ?? null,
          last_location_at:
            (employee as { last_location_at?: string | null })
              .last_location_at || null,
          last_activity:
            (employee as { last_activity?: string | null }).last_activity ||
            null,
        }}
      />

      <LeaveBalancesPanel
        employeeId={employee.id}
        balances={balanceRows}
        leaveTypes={leaveTypes ?? []}
      />

      <EmployeeDocuments employeeId={employee.id} documents={documents ?? []} />
    </div>
  );
}
