import Link from "next/link";
import { notFound } from "next/navigation";
import { SalaryReceiptBatch } from "@/components/payroll/salary-receipt-card";
import { buildReceiptData } from "@/lib/payroll/build-receipt";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createClient } from "@/lib/supabase/server";
import { PrintReportButton } from "@/components/reports/print-button";

export default async function BatchReceiptsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year || now.getFullYear());
  const month = Number(sp.month || now.getMonth() + 1);

  if (!year || month < 1 || month > 12) notFound();

  const { brand } = await loadCompanyBrand();
  if (!brand) notFound();

  const supabase = await createClient();
  const { data: salaries } = await supabase
    .from("salaries")
    .select(
      "id, employee_id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, status, paid_at, payment_method, receipt_number, currency, employees(full_name, employee_code, photo_url, departments(name), positions(name))",
    )
    .eq("year", year)
    .eq("month", month);

  const rows = [...(salaries ?? [])].sort((a, b) => {
    const ea = a.employees as { full_name?: string } | null;
    const eb = b.employees as { full_name?: string } | null;
    return (ea?.full_name || "").localeCompare(eb?.full_name || "", "ckb");
  });
  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-ink-muted">
          بۆ مانگی {month}/{year} هیچ مووچەیەک نییە.
        </p>
        <Link href="/payroll" className="text-sm text-brand-700">
          ← گەڕانەوە
        </Link>
      </div>
    );
  }

  const meta = buildMeta("وەسڵی مووچە", "PAY", "admin");
  const items = await Promise.all(
    rows.map((s) =>
      buildReceiptData(
        s as Parameters<typeof buildReceiptData>[0],
        { id: brand.id, name: brand.name, logo_url: brand.logo_url },
        meta.reportDate,
        async (id, no) => {
          await supabase
            .from("salaries")
            .update({ receipt_number: no })
            .eq("id", id);
        },
        (s as { employee_id?: string }).employee_id,
      ),
    ),
  );

  const pages = Math.ceil(items.length / 2);

  return (
    <div className="mx-auto max-w-[220mm] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/payroll" className="text-sm text-brand-700">
            ← گەڕانەوە بۆ مووچە
          </Link>
          <h1 className="mt-1 text-2xl font-bold">چاپکردنی هەموو وەسڵەکان</h1>
          <p className="text-sm text-ink-muted">
            مانگی {month}/{year} — {items.length} کارمەند · {pages} لاپەڕەی A4
            (٢ کارمەند لە هەر لاپەڕەیەک)
          </p>
        </div>
        <PrintReportButton />
      </div>

      <SalaryReceiptBatch items={items} />
    </div>
  );
}
