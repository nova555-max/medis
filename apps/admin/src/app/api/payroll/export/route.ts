import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createBrandedWorkbook } from "@/lib/reports/excel";

function statusKu(status: string) {
  if (status === "paid") return "پارەدراو";
  if (status === "approved") return "پەسەندکراو";
  if (status === "draft") return "ڕەشنووس";
  return status;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year") || now.getFullYear());
  const monthRaw = searchParams.get("month");
  const month = monthRaw ? Number(monthRaw) : null;
  const status = searchParams.get("status") || "";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const { brand, generatedBy, error } = await loadCompanyBrand();
  if (error || !brand) {
    return NextResponse.json({ error: error || "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("salaries")
    .select(
      "id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, status, paid_at, receipt_number, payment_method, currency, employees(full_name, employee_code, departments(name))",
    )
    .eq("year", year)
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);

  if (month && month >= 1 && month <= 12) {
    query = query.eq("month", month);
  }
  if (status && ["draft", "approved", "paid"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error: qErr } = await query;
  if (qErr) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  type Emp = {
    full_name?: string;
    employee_code?: string;
    departments?: { name?: string } | null;
  } | null;

  let rows = (data ?? []).map((s) => {
    const emp = s.employees as Emp;
    return {
      name: emp?.full_name || "",
      code: emp?.employee_code || "",
      dept: emp?.departments?.name || "",
      period: `${s.month}/${s.year}`,
      base: Number(s.base_amount || 0),
      bonus:
        Number(s.bonus_amount || 0) || Number(s.allowances || 0),
      overtime: Number(s.overtime_amount || 0),
      deductions: Number(s.deductions || 0),
      net: Number(s.net_amount || 0),
      currency: (s as { currency?: string }).currency || "IQD",
      status: statusKu(s.status),
      receipt: (s as { receipt_number?: string | null }).receipt_number || "",
      paidAt: s.paid_at ? String(s.paid_at).slice(0, 10) : "",
      method: (s as { payment_method?: string | null }).payment_method || "",
    };
  });

  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.dept.toLowerCase().includes(q),
    );
  }

  const periodLabel =
    month && month >= 1 && month <= 12
      ? `${month}/${year}`
      : `ساڵی ${year}`;

  const meta = buildMeta(
    `لیستی مووچە — ${periodLabel}`,
    "PAY",
    generatedBy,
    month
      ? {
          from: `${year}-${String(month).padStart(2, "0")}-01`,
          to: `${year}-${String(month).padStart(2, "0")}-28`,
        }
      : { from: `${year}-01-01`, to: `${year}-12-31` },
  );

  const buffer = await createBrandedWorkbook({
    brand,
    meta,
    sheetName: "Payroll",
    columns: [
      { header: "ناو", key: "name", width: 22 },
      { header: "کۆد", key: "code", width: 12 },
      { header: "بەش", key: "dept", width: 16 },
      { header: "مانگ", key: "period", width: 10 },
      { header: "بنەڕەت", key: "base", width: 14 },
      { header: "پاداشت", key: "bonus", width: 12 },
      { header: "ئۆڤەرتایم", key: "overtime", width: 12 },
      { header: "غەرامە", key: "deductions", width: 12 },
      { header: "کۆی خاوێن", key: "net", width: 14 },
      { header: "دراو", key: "currency", width: 8 },
      { header: "دۆخ", key: "status", width: 12 },
      { header: "ژمارەی وەسڵ", key: "receipt", width: 14 },
      { header: "بەرواری پارەدان", key: "paidAt", width: 14 },
      { header: "شێوازی پارەدان", key: "method", width: 14 },
    ],
    rows,
  });

  const fileMonth = month ? `-${String(month).padStart(2, "0")}` : "";
  const filename = `payroll-${year}${fileMonth}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
