import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/server";
import { getContractDesign } from "@/components/contracts/contract-types";
import type { ContractScoreLine } from "@/components/contracts/contract-types";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile?.is_active ||
    (profile.role !== "admin" && profile.role !== "manager")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("employee_contracts")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .maybeSingle();

  const design = getContractDesign(String(row.design_id));
  const scores = Array.isArray(row.scores)
    ? (row.scores as ContractScoreLine[])
    : [];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 16;
  let y = 18;

  doc.setFillColor(design.ink);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(company?.name || "Media Office", margin, 12);
  doc.setFontSize(9);
  doc.text("Employment Contract / گرێبەستی کارکردن", margin, 19);
  doc.text(String(row.contract_number || id.slice(0, 8)), 210 - margin, 12, {
    align: "right",
  });

  y = 38;
  doc.setTextColor(design.ink);
  doc.setFontSize(13);
  doc.text("Employee Contract", margin, y);
  y += 8;

  doc.setFontSize(10);
  const fields: [string, string][] = [
    ["Name", String(row.holder_name || "")],
    ["Profession", String(row.profession || "")],
    ["Phone", String(row.phone || "—")],
    ["Age", row.age != null ? String(row.age) : "—"],
    ["Address", String(row.address || "—")],
    [
      "Period",
      `${row.start_date || "—"} → ${row.end_date || "—"}`,
    ],
    ["Salary note", String(row.salary_note || "—")],
  ];

  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 210 - margin * 2 - 35);
    doc.text(lines, margin + 35, y);
    y += Math.max(7, lines.length * 5);
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Terms", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const body = String(row.body_ckb || "").trim() || "—";
  // Kurdish may not render perfectly in default fonts; still export Latin/numbers cleanly
  const bodyLines = doc.splitTextToSize(body, 210 - margin * 2);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 4.5 + 6;

  if (scores.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Criteria", "Points", "Max"]],
      body: scores.map((s) => [
        s.label,
        String(s.points),
        String(s.maxPoints),
      ]),
      foot: [
        [
          "Total",
          String(scores.reduce((a, s) => a + Number(s.points || 0), 0)),
          String(scores.reduce((a, s) => a + Number(s.maxPoints || 0), 0)),
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: design.ink },
      margin: { left: margin, right: margin },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY || y) + 14;
  }

  doc.setDrawColor(design.rule);
  doc.line(margin, y, margin + 60, y);
  doc.line(210 - margin - 60, y, 210 - margin, y);
  doc.setFontSize(9);
  doc.text("Company signature", margin, y + 6);
  doc.text("Employee signature", 210 - margin, y + 6, { align: "right" });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `contract-${row.contract_number || id}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
