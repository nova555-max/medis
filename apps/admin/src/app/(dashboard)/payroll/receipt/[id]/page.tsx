import Link from "next/link";
import { notFound } from "next/navigation";
import { SalaryReceiptA4Page } from "@/components/payroll/salary-receipt-card";
import { buildReceiptData } from "@/lib/payroll/build-receipt";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createClient } from "@/lib/supabase/server";
import { PrintReportButton } from "@/components/reports/print-button";

export default async function SalaryReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { brand } = await loadCompanyBrand();
  if (!brand) notFound();

  const supabase = await createClient();
  const { data: salary } = await supabase
    .from("salaries")
    .select(
      "id, employee_id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, status, paid_at, payment_method, receipt_number, currency, employees(full_name, employee_code, photo_url, departments(name), positions(name))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!salary) notFound();

  const meta = buildMeta("وەسڵی مووچە", "PAY", "admin");
  const shared = await buildReceiptData(
    salary as Parameters<typeof buildReceiptData>[0],
    { id: brand.id, name: brand.name, logo_url: brand.logo_url },
    meta.reportDate,
    async (sid, no) => {
      await supabase.from("salaries").update({ receipt_number: no }).eq("id", sid);
    },
    salary.employee_id,
  );

  return (
    <div className="mx-auto max-w-[220mm] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/payroll" className="text-sm text-brand-700">
            ← گەڕانەوە بۆ مووچە
          </Link>
          <h1 className="mt-1 text-2xl font-bold">وەسڵی مووچە</h1>
          <p className="text-sm text-ink-muted">
            تەنها بۆ کارمەند — بۆ کەمکردنەوەی کاغەز ٢ کارمەند لە یەک A4 چاپ بکە
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/payroll/receipts/print?year=${salary.year}&month=${salary.month}`}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            چاپکردنی هەموو کارمەندانی ئەم مانگە
          </Link>
          <Link
            href={`/api/payroll/receipt/${id}`}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm"
          >
            داگرتنی PDF
          </Link>
          <PrintReportButton />
        </div>
      </div>

      <SalaryReceiptA4Page items={[shared]} />
    </div>
  );
}
