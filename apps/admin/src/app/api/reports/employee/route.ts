import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createBrandedPdf } from "@/lib/reports/pdf";
import { createBrandedWorkbook } from "@/lib/reports/excel";
import { minsToHours } from "@/lib/reports/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const from =
    searchParams.get("from") ||
    new Date().toISOString().slice(0, 8) + "01";
  const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const format = (searchParams.get("format") || "pdf").toLowerCase();

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  const { brand, generatedBy, error } = await loadCompanyBrand();
  if (error || !brand) {
    return NextResponse.json({ error: error || "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select(
      "id, full_name, employee_code, email, phone, hire_date, photo_url, departments(name), positions(name)",
    )
    .eq("id", employeeId)
    .maybeSingle();

  if (!emp) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [{ data: attendance }, { data: leaves }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("work_date, status, late_minutes, overtime_minutes, worked_minutes")
      .eq("employee_id", employeeId)
      .gte("work_date", from)
      .lte("work_date", to),
    supabase
      .from("leave_requests")
      .select("start_date, end_date, days_count, status, leave_types(name_ckb)")
      .eq("employee_id", employeeId)
      .gte("start_date", from)
      .lte("end_date", to),
  ]);

  const rows = attendance ?? [];
  const totalWorked = rows.reduce((s, r) => s + (r.worked_minutes || 0), 0);
  const totalOt = rows.reduce((s, r) => s + (r.overtime_minutes || 0), 0);
  const lateCount = rows.filter(
    (r) => (r.late_minutes || 0) > 0 || r.status === "late",
  ).length;
  const absentCount = rows.filter((r) => r.status === "absent").length;
  const leaveDays = (leaves ?? [])
    .filter((l) => l.status === "approved")
    .reduce((s, l) => s + Number(l.days_count || 0), 0);

  const dept = emp.departments as { name?: string } | null;
  const pos = emp.positions as { name?: string } | null;

  const meta = buildMeta(
    `ڕاپۆرتی کارمەند — ${emp.full_name}`,
    "EMP",
    generatedBy,
    { from, to },
  );

  if (format === "xlsx") {
    const buffer = await createBrandedWorkbook({
      brand,
      meta,
      sheetName: "Employee",
      columns: [
        { header: "Field", key: "field", width: 22 },
        { header: "Value", key: "value", width: 36 },
      ],
      rows: [
        { field: "Name", value: emp.full_name },
        { field: "Code", value: emp.employee_code },
        { field: "ID", value: emp.id },
        { field: "Department", value: dept?.name || "" },
        { field: "Position", value: pos?.name || "" },
        { field: "Hire date", value: emp.hire_date || "" },
        { field: "Phone", value: emp.phone || "" },
        { field: "Email", value: emp.email || "" },
        { field: "Total worked", value: minsToHours(totalWorked) },
        { field: "Overtime", value: minsToHours(totalOt) },
        { field: "Late count", value: lateCount },
        { field: "Absence count", value: absentCount },
        { field: "Leave days", value: leaveDays },
      ],
    });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${meta.reportNumber}.xlsx"`,
      },
    });
  }

  const pdf = await createBrandedPdf({ brand, meta });
  let y = pdf.startY;
  y =
    pdf.table(
      [["Field", "Value"]],
      [
        ["Name", emp.full_name],
        ["Employee ID", emp.id],
        ["Code", emp.employee_code],
        ["Department", dept?.name || "—"],
        ["Position", pos?.name || "—"],
        ["Hire date", emp.hire_date || "—"],
        ["Phone", emp.phone || "—"],
        ["Email", emp.email || "—"],
        ["Total working hours", minsToHours(totalWorked)],
        ["Overtime hours", minsToHours(totalOt)],
        ["Late count", String(lateCount)],
        ["Absence count", String(absentCount)],
        ["Approved leave days", String(leaveDays)],
      ],
      y,
    ) + 16;

  pdf.table(
    [["Date", "Status", "Late", "Worked", "OT"]],
    rows.slice(0, 40).map((r) => [
      r.work_date,
      r.status,
      r.late_minutes || 0,
      minsToHours(r.worked_minutes || 0),
      minsToHours(r.overtime_minutes || 0),
    ]),
    y,
  );

  const buffer = pdf.finish();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${meta.reportNumber}.pdf"`,
    },
  });
}
