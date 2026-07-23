import { NextRequest, NextResponse } from "next/server";
import { createBrandedPdf } from "@/lib/reports/pdf";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createClient } from "@/lib/supabase/server";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    present: "Present",
    late: "Late",
    early_leave: "Early leave",
    absent: "Absent",
    on_leave: "On leave",
    incomplete: "Incomplete",
    overtime: "Overtime",
  };
  return map[s] || s;
}

export async function GET(request: NextRequest) {
  const { brand, error } = await loadCompanyBrand();
  if (error || !brand) {
    return NextResponse.json({ error: error || "unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const date =
    sp.get("date") ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
      new Date(),
    );
  const q = (sp.get("q") || "").trim().toLowerCase();
  const view = sp.get("view") || "late"; // late | absent | all

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("attendance_records")
    .select(
      "work_date, check_in_at, check_out_at, status, late_minutes, worked_minutes, employees(full_name, employee_code)",
    )
    .eq("work_date", date)
    .order("late_minutes", { ascending: false });

  let list = rows ?? [];

  if (view === "late") {
    list = list.filter(
      (r) => (r.late_minutes || 0) > 0 || r.status === "late",
    );
  } else if (view === "absent") {
    list = list.filter((r) => r.status === "absent");
  }

  if (q) {
    list = list.filter((r) => {
      const emp = r.employees as
        | { full_name?: string; employee_code?: string }
        | null;
      const hay = `${emp?.full_name || ""} ${emp?.employee_code || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const title =
    view === "absent"
      ? "Absent employees list"
      : view === "all"
        ? "Daily attendance list"
        : "Late employees list";

  const meta = buildMeta(title, "ATT", "admin", { from: date, to: date });

  const pdf = await createBrandedPdf({ brand, meta });

  const body = list.map((r, i) => {
    const emp = r.employees as
      | { full_name?: string; employee_code?: string }
      | null;
    const cin = r.check_in_at
      ? new Date(r.check_in_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
    const cout = r.check_out_at
      ? new Date(r.check_out_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
    return [
      i + 1,
      emp?.full_name || "—",
      emp?.employee_code || "—",
      cin,
      cout,
      statusLabel(r.status),
      r.late_minutes || 0,
    ];
  });

  pdf.table(
    [
      [
        "#",
        "Employee",
        "ID",
        "Check-in",
        "Check-out",
        "Status",
        "Late (min)",
      ],
    ],
    body.length
      ? body
      : [["—", "No records", "—", "—", "—", "—", "—"]],
    pdf.startY,
  );

  // Summary box
  const doc = pdf.doc;
  const y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY
    ? (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
    : pdf.startY + 40;
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(36, y, pdf.pageW - 72, 56, 6, 6, "F");
  doc.setTextColor(42, 90, 143);
  doc.setFontSize(11);
  doc.text(`Date: ${date}`, 48, y + 20);
  doc.text(`Total rows: ${list.length}`, 48, y + 38);
  const lateCount = list.filter(
    (r) => (r.late_minutes || 0) > 0 || r.status === "late",
  ).length;
  doc.text(`Late: ${lateCount}`, 200, y + 38);

  const buf = pdf.finish();
  const filename = `attendance-${view}-${date}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
