import QRCode from "qrcode";
import type { ReceiptData } from "@/components/payroll/salary-receipt-card";
import { makeReportNumber } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

type SalaryRow = {
  id: string;
  year: number;
  month: number;
  base_amount: number | null;
  allowances: number | null;
  deductions: number | null;
  overtime_amount: number | null;
  bonus_amount: number | null;
  net_amount: number | null;
  paid_at: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  currency?: string | null;
  employee_id?: string;
  employees:
    | {
        full_name?: string;
        employee_code?: string;
        photo_url?: string | null;
        departments?: { name?: string } | null;
        positions?: { name?: string } | null;
      }
    | {
        full_name?: string;
        employee_code?: string;
        photo_url?: string | null;
        departments?: { name?: string } | null;
        positions?: { name?: string } | null;
      }[]
    | null;
};

function reasonLabel(title: string, note: string | null | undefined) {
  if (note === "auto_late_fine") return "غەرامەی خۆکاری دواکەوتن";
  if (note && note.trim()) return note.trim();
  return title;
}

export async function loadSalaryLineItems(
  employeeId: string,
  year: number,
  month: number,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rewards")
    .select("title, note, amount, kind, reward_date")
    .eq("employee_id", employeeId)
    .order("reward_date", { ascending: true });

  const monthRows = (data ?? []).filter((r) => {
    const d = new Date(String(r.reward_date));
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const fines = monthRows
    .filter((r) => r.kind === "fine")
    .map((r) => ({
      title: r.title,
      reason: reasonLabel(r.title, r.note),
      amount: Number(r.amount),
    }));

  const rewards = monthRows
    .filter((r) => r.kind !== "fine")
    .map((r) => ({
      title: r.title,
      reason: reasonLabel(r.title, r.note),
      amount: Number(r.amount),
    }));

  return { fines, rewards };
}

export async function buildReceiptData(
  salary: SalaryRow,
  company: { id: string; name: string; logo_url: string | null },
  reportDate: string,
  ensureReceiptNo?: (id: string, no: string) => Promise<void>,
  employeeId?: string,
): Promise<ReceiptData> {
  const empRaw = salary.employees;
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw;

  let receiptNo = salary.receipt_number;
  if (!receiptNo) {
    receiptNo = makeReportNumber("PAY");
    if (ensureReceiptNo) await ensureReceiptNo(salary.id, receiptNo);
  }

  const overtime = Number(salary.overtime_amount || 0);
  const bonus =
    Number(salary.bonus_amount || 0) || Number(salary.allowances || 0);
  const base = Number(salary.base_amount || 0);
  const ded = Number(salary.deductions || 0);
  const net = Number(salary.net_amount || base + overtime + bonus - ded);

  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({
      v: 1,
      c: company.id,
      s: salary.id,
      n: net,
      r: receiptNo,
    }),
    { width: 140, margin: 1 },
  );

  let fineItems: ReceiptData["fineItems"] = [];
  let rewardItems: ReceiptData["rewardItems"] = [];
  const empId = employeeId || salary.employee_id;
  if (empId) {
    const lines = await loadSalaryLineItems(empId, salary.year, salary.month);
    fineItems = lines.fines;
    rewardItems = lines.rewards;
  }

  return {
    receiptNo,
    reportDate,
    month: salary.month,
    year: salary.year,
    paidAt: salary.paid_at,
    paymentMethod: salary.payment_method || "cash",
    base,
    overtime,
    bonus,
    deductions: ded,
    net,
    currency: salary.currency || "IQD",
    qrDataUrl,
    fineItems,
    rewardItems,
    company: {
      name: company.name,
      logo_url: company.logo_url,
    },
    employee: {
      full_name: emp?.full_name || "—",
      employee_code: emp?.employee_code || "—",
      photo_url: emp?.photo_url,
      department: emp?.departments?.name,
      position: emp?.positions?.name,
    },
  };
}
