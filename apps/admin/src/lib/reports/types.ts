export type CompanyBrand = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  report_watermark: string | null;
  stamp_text: string | null;
};

export type ReportMeta = {
  title: string;
  reportNumber: string;
  reportDate: string;
  generatedBy: string;
  generatedAt: string;
  from?: string;
  to?: string;
};

export function makeReportNumber(prefix: string) {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join("");
  return `${prefix}-${stamp}`;
}

export function fmtMoney(n: number | null | undefined) {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function minsToHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export const BRAND_HEX = "#2a5a8f";
