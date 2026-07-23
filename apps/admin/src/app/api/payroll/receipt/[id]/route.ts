import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { loadCompanyBrand } from "@/lib/reports/company";
import { fmtMoney, makeReportNumber } from "@/lib/reports/types";

const MONTH_CKB = [
  "",
  "کانوونی دووەم",
  "شوبات",
  "ئازار",
  "نیسان",
  "ئایار",
  "حوزەیران",
  "تەممووز",
  "ئاب",
  "ئەیلوول",
  "تشرینی یەکەم",
  "تشرینی دووەم",
  "کانوونی یەکەم",
];

const PAYMENT: Record<string, string> = {
  cash: "کاش",
  bank: "بانک",
  transfer: "گواستنەوە",
};

type Stub = {
  receiptNo: string;
  monthLabel: string;
  paidDate: string;
  payment: string;
  name: string;
  code: string;
  meta: string;
  base: number;
  overtime: number;
  bonus: number;
  ded: number;
  net: number;
  currency: string;
  qr: string;
  companyName: string;
  fineLines: { reason: string; amount: number }[];
};

function money(n: number, currency: string) {
  return currency === "USD" ? `$${fmtMoney(n)}` : `${fmtMoney(n)} IQD`;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const batch = request.nextUrl.searchParams.get("batch") === "1";
  const { brand, error } = await loadCompanyBrand();
  if (error || !brand) {
    return NextResponse.json({ error: error || "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const loadOne = async (salaryId: string): Promise<Stub | null> => {
    const { data: salary } = await supabase
      .from("salaries")
      .select(
        "id, employee_id, year, month, base_amount, allowances, deductions, overtime_amount, bonus_amount, net_amount, paid_at, payment_method, receipt_number, currency, employees(full_name, employee_code, departments(name), positions(name))",
      )
      .eq("id", salaryId)
      .maybeSingle();
    if (!salary) return null;

    const emp = salary.employees as {
      full_name?: string;
      employee_code?: string;
      departments?: { name?: string } | null;
      positions?: { name?: string } | null;
    } | null;

    let receiptNo = salary.receipt_number;
    if (!receiptNo) {
      receiptNo = makeReportNumber("PAY");
      await supabase
        .from("salaries")
        .update({ receipt_number: receiptNo })
        .eq("id", salaryId);
    }

    const overtime = Number(salary.overtime_amount || 0);
    const bonus =
      Number(salary.bonus_amount || 0) || Number(salary.allowances || 0);
    const base = Number(salary.base_amount || 0);
    const ded = Number(salary.deductions || 0);
    const net = Number(salary.net_amount || base + overtime + bonus - ded);
    const currency = (salary as { currency?: string }).currency || "IQD";
    const qr = await QRCode.toDataURL(
      JSON.stringify({
        v: 1,
        c: brand.id,
        s: salary.id,
        n: net,
        r: receiptNo,
      }),
      { width: 120, margin: 1 },
    );

    const { data: rewardRows } = await supabase
      .from("rewards")
      .select("title, note, amount, kind, reward_date")
      .eq("employee_id", salary.employee_id)
      .eq("kind", "fine");

    const fineLines = (rewardRows ?? [])
      .filter((r) => {
        const d = new Date(String(r.reward_date));
        return d.getFullYear() === salary.year && d.getMonth() + 1 === salary.month;
      })
      .map((r) => ({
        reason:
          r.note === "auto_late_fine"
            ? "غەرامەی خۆکاری دواکەوتن"
            : (r.note && String(r.note).trim()) || r.title,
        amount: Number(r.amount),
      }));

    return {
      receiptNo,
      monthLabel: `${MONTH_CKB[salary.month] || salary.month} ${salary.year}`,
      paidDate: salary.paid_at
        ? new Date(salary.paid_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      payment:
        PAYMENT[salary.payment_method || "cash"] ||
        salary.payment_method ||
        "کاش",
      name: emp?.full_name || "—",
      code: emp?.employee_code || "—",
      meta: [emp?.departments?.name, emp?.positions?.name]
        .filter(Boolean)
        .join(" · "),
      base,
      overtime,
      bonus,
      ded,
      net,
      currency,
      qr,
      companyName: brand.name,
      fineLines,
    };
  };

  let stubs: Stub[] = [];

  if (batch) {
    const { data: one } = await supabase
      .from("salaries")
      .select("year, month")
      .eq("id", id)
      .maybeSingle();
    if (!one) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const { data: all } = await supabase
      .from("salaries")
      .select("id, employees(full_name)")
      .eq("year", one.year)
      .eq("month", one.month);
    const sorted = [...(all ?? [])].sort((a, b) => {
      const ea = a.employees as { full_name?: string } | null;
      const eb = b.employees as { full_name?: string } | null;
      return (ea?.full_name || "").localeCompare(eb?.full_name || "", "ckb");
    });
    for (const row of sorted) {
      const stub = await loadOne(row.id);
      if (stub) stubs.push(stub);
    }
  } else {
    const stub = await loadOne(id);
    if (!stub) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    stubs = [stub];
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const midY = pageH / 2;
  const margin = 28;

  const drawHalf = (stub: Stub, topY: number) => {
    const boxH = midY - 10;
    const bottom = topY + boxH - 8;

    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.8);
    doc.rect(margin, topY, pageW - margin * 2, boxH - 8);

    doc.setFillColor(42, 90, 143);
    doc.rect(margin, topY, pageW - margin * 2, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(stub.companyName, margin + 12, topY + 16);
    doc.setFontSize(9);
    doc.text("وەسڵی مووچە — کارمەند", margin + 12, topY + 28);
    doc.setFontSize(9);
    doc.text(stub.monthLabel, pageW - margin - 12, topY + 22, {
      align: "right",
    });

    let y = topY + 52;
    const colW = (pageW - margin * 2 - 24) / 4;
    const metas: [string, string][] = [
      ["ڕێکەوت", stub.paidDate],
      ["مووچەی مانگی", stub.monthLabel],
      ["ژمارەی وەسڵ", stub.receiptNo],
      ["شێوازی پارەدان", stub.payment],
    ];
    metas.forEach(([k, v], i) => {
      const x = margin + 12 + i * colW;
      doc.setTextColor(110, 120, 130);
      doc.setFontSize(7);
      doc.text(k, x, y);
      doc.setTextColor(30, 40, 55);
      doc.setFontSize(9);
      doc.text(String(v), x, y + 12);
    });

    y += 32;
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 45);
    doc.text(stub.name, margin + 12, y);
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 120);
    doc.text(`${stub.code}${stub.meta ? ` · ${stub.meta}` : ""}`, margin + 12, y + 12);

    y += 32;
    const rows: [string, string][] = [
      ["مووچەی بنەڕەتی", money(stub.base, stub.currency)],
    ];
    if (stub.overtime > 0)
      rows.push(["کاتی زیادە", money(stub.overtime, stub.currency)]);
    if (stub.bonus > 0) rows.push(["پاداشت", money(stub.bonus, stub.currency)]);
    if (stub.ded > 0)
      rows.push(["غەرامە / لێبڕین", money(stub.ded, stub.currency)]);
    for (const f of stub.fineLines) {
      rows.push([`هۆکار: ${f.reason}`, money(f.amount, stub.currency)]);
    }

    doc.setFontSize(9);
    rows.forEach(([k, v]) => {
      doc.setTextColor(90, 100, 110);
      doc.text(k, margin + 12, y);
      doc.setTextColor(30, 40, 55);
      doc.text(v, pageW - margin - 12, y, { align: "right" });
      y += 12;
    });

    y += 6;
    doc.setFillColor(42, 90, 143);
    doc.roundedRect(margin + 10, y, pageW - margin * 2 - 20, 28, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("مووچەی خاوێن", margin + 20, y + 18);
    doc.setFontSize(11);
    doc.text(money(stub.net, stub.currency), pageW - margin - 20, y + 18, {
      align: "right",
    });

    const sigY = bottom - 78;
    try {
      doc.addImage(stub.qr, "PNG", margin + 16, sigY, 56, 56);
    } catch {
      // ignore
    }
    doc.setTextColor(120, 130, 140);
    doc.setFontSize(7);
    doc.text("پشتڕاستکردنەوە", margin + 44, sigY + 66, { align: "center" });

    const sigX = pageW / 2 + 20;
    doc.setDrawColor(160, 170, 180);
    doc.setLineDashPattern([3, 2], 0);
    doc.line(sigX, sigY + 40, pageW - margin - 20, sigY + 40);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 110);
    doc.text("واژووی کارمەند", (sigX + pageW - margin - 20) / 2, sigY + 54, {
      align: "center",
    });
  };

  for (let i = 0; i < stubs.length; i += 2) {
    if (i > 0) doc.addPage();
    drawHalf(stubs[i], 12);
    doc.setDrawColor(150, 160, 170);
    doc.setLineDashPattern([4, 3], 0);
    doc.line(margin, midY, pageW - margin, midY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 160);
    doc.text("بڕین لێرە · دوو کارمەند / A4", pageW / 2, midY + 3, {
      align: "center",
    });
    if (stubs[i + 1]) drawHalf(stubs[i + 1], midY + 8);
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const name = batch
    ? `salary-batch-${stubs[0]?.monthLabel || "all"}.pdf`
    : `salary-${stubs[0]?.receiptNo || id}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
