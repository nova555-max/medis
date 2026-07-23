import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SalaryReceiptCard } from "@/components/payroll/salary-receipt-card";
import { buildReceiptData } from "@/lib/payroll/build-receipt";
import { createClient } from "@/lib/supabase/server";
import { PrintReportButton } from "@/components/reports/print-button";

export default async function EmployeeSalaryReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/employee/login");

  const { data: emp } = await supabase
    .from("employees")
    .select(
      "id, full_name, employee_code, photo_url, company_id, departments(name), positions(name)",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (!emp) notFound();

  const { data: salary } = await supabase
    .from("salaries")
    .select(
      "id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, status, paid_at, payment_method, receipt_number, currency, company_id",
    )
    .eq("id", id)
    .eq("employee_id", emp.id)
    .in("status", ["paid", "approved"])
    .maybeSingle();

  if (!salary) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_url")
    .eq("id", salary.company_id)
    .maybeSingle();

  const dept = emp.departments as { name?: string } | null;
  const pos = emp.positions as { name?: string } | null;

  const data = await buildReceiptData(
    {
      ...salary,
      employee_id: emp.id,
      employees: {
        full_name: emp.full_name,
        employee_code: emp.employee_code,
        photo_url: emp.photo_url,
        departments: dept,
        positions: pos,
      },
    },
    {
      id: company?.id || "",
      name: company?.name || "میدیا ئۆفیس",
      logo_url: company?.logo_url || null,
    },
    new Date().toISOString().slice(0, 10),
    undefined,
    emp.id,
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/employee/salary" className="text-sm text-brand-700">
          ← گەڕانەوە
        </Link>
        <PrintReportButton />
      </div>

      <SalaryReceiptCard data={data} />
    </div>
  );
}
