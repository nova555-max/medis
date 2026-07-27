export type ContractDesignId =
  | "classic_legal"
  | "modern_corporate"
  | "formal_navy"
  | "media_editorial";

export type ContractDesign = {
  id: ContractDesignId;
  nameKu: string;
  nameEn: string;
  ink: string;
  accent: string;
  paper: string;
  muted: string;
  rule: string;
};

export type ContractScoreLine = {
  criteriaId: string;
  label: string;
  points: number;
  maxPoints: number;
};

export type ContractScoreCriterion = {
  id: string;
  label: string;
  max_points: number;
  sort_order: number;
  is_active: boolean;
};

export type EmployeeContractRecord = {
  id: string;
  design_id: ContractDesignId;
  contract_number: string | null;
  holder_name: string;
  profession: string;
  phone: string | null;
  age: number | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  salary_note: string | null;
  body_ckb: string | null;
  scores: ContractScoreLine[];
  status: string;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
};

export const CONTRACT_DESIGNS: ContractDesign[] = [
  {
    id: "classic_legal",
    nameKu: "یاسایی کلاسیک",
    nameEn: "Classic Legal",
    ink: "#1c1917",
    accent: "#7f1d1d",
    paper: "#fffdf8",
    muted: "#78716c",
    rule: "#a8a29e",
  },
  {
    id: "modern_corporate",
    nameKu: "کۆمپانیای مۆدێرن",
    nameEn: "Modern Corporate",
    ink: "#0f172a",
    accent: "#0f766e",
    paper: "#ffffff",
    muted: "#64748b",
    rule: "#cbd5e1",
  },
  {
    id: "formal_navy",
    nameKu: "فەرمی سەوز",
    nameEn: "Formal Navy",
    ink: "#0c1e3a",
    accent: "#1d4ed8",
    paper: "#f8fafc",
    muted: "#475569",
    rule: "#94a3b8",
  },
  {
    id: "media_editorial",
    nameKu: "میدیای سەردەمی",
    nameEn: "Media Editorial",
    ink: "#111827",
    accent: "#b45309",
    paper: "#fffbeb",
    muted: "#78716c",
    rule: "#d6d3d1",
  },
];

export const DEFAULT_CONTRACT_BODY = `ئەم گرێبەستە لە نێوان دەزگای میدیا و کارمەنددا واژوو دەکرێت.

١) کارمەند پابەندە بە یاسا و ڕێنماییەکانی دەزگا.
٢) کاتی کارکردن و ئامادەبوون بەپێی سیستەمی ئامادەبوون دەبێت.
٣) نهێنی پیشەیی و داتای دەزگا نابێت بڵاوبکرێتەوە.
٤) مووچە و پاداشت بەپێی ڕێکخستنی ناوخۆیی دەدرێت.
٥) هەر لایەک دەتوانێت گرێبەست بە ئاگاداری پێشوەخت کۆتایی پێ بهێنێت.`;

export function getContractDesign(id: string): ContractDesign {
  return (
    CONTRACT_DESIGNS.find((d) => d.id === id) || CONTRACT_DESIGNS[0]
  );
}
