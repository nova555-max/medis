import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadCompanyBrand, buildMeta } from "@/lib/reports/company";
import { createBrandedPdf } from "@/lib/reports/pdf";
import { createBrandedWorkbook } from "@/lib/reports/excel";
import { minsToHours } from "@/lib/reports/types";

type Row = {
  work_date: string;
  status: string;
  late_minutes: number | null;
  overtime_minutes: number | null;
  worked_minutes: number | null;
  employee_id: string;
  employees: {
    full_name?: string;
    employee_code?: string;
    departments?: { name?: string } | null;
  } | null;
};

function filterRows(
  data: Row[],
  type: string,
  employeeId?: string | null,
  departmentId?: string | null,
) {
  let rows = data;
  if (employeeId) rows = rows.filter((r) => r.employee_id === employeeId);
  if (type === "late") {
    rows = rows.filter((r) => (r.late_minutes || 0) > 0 || r.status === "late");
  } else if (type === "absence") {
    rows = rows.filter((r) => r.status === "absent");
  }
  return rows;
}

function titleFor(type: string) {
  switch (type) {
    case "daily":
      return "ڕاپۆرتی ئامادەبوونی ڕۆژانە";
    case "monthly":
      return "ڕاپۆرتی ئامادەبوونی مانگانە";
    case "yearly":
      return "ڕاپۆرتی ئامادەبوونی ساڵانە";
    case "absence":
      return "ڕاپۆرتی غیاب";
    case "late":
      return "ڕاپۆرتی دواکەوتن";
    case "employee":
      return "ڕاپۆرتی ئامادەبوونی کارمەند";
    case "department":
      return "ڕاپۆرتی ئامادەبوونی بەش";
    default:
      return "ڕاپۆرتی ئامادەبوون";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || from;
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  const type = searchParams.get("type") || "daily";
  const employeeId = searchParams.get("employeeId");
  const departmentId = searchParams.get("departmentId");

  const { brand, generatedBy, error } = await loadCompanyBrand();
  if (error || !brand) {
    return NextResponse.json({ error: error || "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("attendance_records")
    .select(
      "work_date, status, late_minutes, overtime_minutes, worked_minutes, employee_id, employees(full_name, employee_code, department_id, departments(name))",
    )
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: true });

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (departmentId) {
    // filter via employee department after fetch if join filter is awkward
  }

  const { data } = await query;
  let rows = (data ?? []).map((r) => ({
    ...r,
    employees: r.employees as Row["employees"],
  })) as Row[];

  if (departmentId) {
    rows = rows.filter((r) => {
      const emp = r.employees as { department_id?: string } | null;
      return emp && (emp as { department_id?: string }).department_id === departmentId;
    });
  }

  rows = filterRows(rows, type, null, null);
  const meta = buildMeta(titleFor(type), "ATT", generatedBy, { from, to });

  const tableRows = rows.map((row) => ({
    date: row.work_date,
    name: row.employees?.full_name || "",
    code: row.employees?.employee_code || "",
    dept: row.employees?.departments?.name || "",
    status: row.status,
    late: row.late_minutes || 0,
    worked: minsToHours(row.worked_minutes || 0),
    ot: minsToHours(row.overtime_minutes || 0),
  }));

  if (format === "pdf") {
    const pdf = await createBrandedPdf({
      brand,
      meta,
      orientation: "landscape",
    });
    pdf.table(
      [["Date", "Employee", "Code", "Dept", "Status", "Late", "Worked", "OT"]],
      tableRows.map((r) => [
        r.date,
        r.name,
        r.code,
        r.dept,
        r.status,
        r.late,
        r.worked,
        r.ot,
      ]),
      pdf.startY,
    );
    const buffer = pdf.finish();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${meta.reportNumber}.pdf"`,
      },
    });
  }

  const buffer = await createBrandedWorkbook({
    brand,
    meta,
    sheetName: "Attendance",
    columns: [
      { header: "Date", key: "date", width: 12 },
      { header: "Employee", key: "name", width: 22 },
      { header: "Code", key: "code", width: 12 },
      { header: "Department", key: "dept", width: 16 },
      { header: "Status", key: "status", width: 12 },
      { header: "Late (min)", key: "late", width: 10 },
      { header: "Worked", key: "worked", width: 10 },
      { header: "OT", key: "ot", width: 10 },
    ],
    rows: tableRows,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${meta.reportNumber}.xlsx"`,
    },
  });
}
