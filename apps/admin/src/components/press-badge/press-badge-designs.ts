export type PressBadgeDesignId =
  | "ifj_standard"
  | "national_union"
  | "wire_agency"
  | "broadcast_staff"
  | "event_accreditation"
  | "press_gallery"
  | "photojournalist"
  | "correspondent"
  | "institution_pass"
  | "checkpoint_media";

export type PressBadgeLayout =
  | "classic_id"
  | "agency_id"
  | "accreditation"
  | "gallery"
  | "checkpoint";

export type PressBadgeDesign = {
  id: PressBadgeDesignId;
  nameKu: string;
  nameEn: string;
  layout: PressBadgeLayout;
  /** Header / institutional band */
  ink: string;
  /** Card surface */
  paper: string;
  /** Body text */
  text: string;
  /** Muted labels */
  muted: string;
  /** Thin rules / borders */
  rule: string;
  /** Official PRESS mark background */
  pressMark: string;
  pressMarkText: string;
};

export type PressBadgeData = {
  designId: PressBadgeDesignId;
  organization: string;
  holderName: string;
  title: string;
  mediaOutlet: string;
  badgeId: string;
  validFrom: string;
  validTo: string;
  frontNote: string;
  backNote: string;
  emergencyPhone: string;
  website: string;
  photoDataUrl: string | null;
  logoDataUrl: string | null;
  customPrimary: string;
  customAccent: string;
  useCustomColors: boolean;
};

/**
 * Ten institutional credential variants — same sober ID grammar,
 * different issuing-body color systems used worldwide for press passes.
 */
export const PRESS_BADGE_DESIGNS: PressBadgeDesign[] = [
  {
    id: "ifj_standard",
    nameKu: "کارتی نێودەوڵەتی",
    nameEn: "International Press Credential",
    layout: "classic_id",
    ink: "#003087",
    paper: "#ffffff",
    text: "#111827",
    muted: "#4b5563",
    rule: "#94a3b8",
    pressMark: "#b91c1c",
    pressMarkText: "#ffffff",
  },
  {
    id: "national_union",
    nameKu: "یەکێتیی ڕۆژنامەنووسان",
    nameEn: "National Journalists Union",
    layout: "classic_id",
    ink: "#1e3a5f",
    paper: "#f8fafc",
    text: "#0f172a",
    muted: "#475569",
    rule: "#94a3b8",
    pressMark: "#9f1239",
    pressMarkText: "#ffffff",
  },
  {
    id: "wire_agency",
    nameKu: "ئاژانسی هەواڵ",
    nameEn: "Wire Agency Staff ID",
    layout: "agency_id",
    ink: "#111827",
    paper: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    rule: "#d1d5db",
    pressMark: "#111827",
    pressMarkText: "#ffffff",
  },
  {
    id: "broadcast_staff",
    nameKu: "کارمەندی پەخش",
    nameEn: "Broadcast Staff Pass",
    layout: "agency_id",
    ink: "#1e293b",
    paper: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    rule: "#cbd5e1",
    pressMark: "#0f766e",
    pressMarkText: "#ffffff",
  },
  {
    id: "event_accreditation",
    nameKu: "باجی ڕووداو",
    nameEn: "Event Media Accreditation",
    layout: "accreditation",
    ink: "#0f172a",
    paper: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    rule: "#94a3b8",
    pressMark: "#c2410c",
    pressMarkText: "#ffffff",
  },
  {
    id: "press_gallery",
    nameKu: "گالەریی پەرلەمان",
    nameEn: "Press Gallery Credential",
    layout: "gallery",
    ink: "#3f1d0f",
    paper: "#fffdf8",
    text: "#1c1917",
    muted: "#78716c",
    rule: "#a8a29e",
    pressMark: "#7f1d1d",
    pressMarkText: "#ffffff",
  },
  {
    id: "photojournalist",
    nameKu: "وێنەگری ڕۆژنامە",
    nameEn: "Photojournalist Credential",
    layout: "classic_id",
    ink: "#292524",
    paper: "#fafaf9",
    text: "#1c1917",
    muted: "#57534e",
    rule: "#a8a29e",
    pressMark: "#44403c",
    pressMarkText: "#ffffff",
  },
  {
    id: "correspondent",
    nameKu: "پەیامنێری مەیدان",
    nameEn: "Field Correspondent",
    layout: "agency_id",
    ink: "#14532d",
    paper: "#ffffff",
    text: "#14532d",
    muted: "#4b5563",
    rule: "#86efac",
    pressMark: "#166534",
    pressMarkText: "#ffffff",
  },
  {
    id: "institution_pass",
    nameKu: "باجی دامەزراوە",
    nameEn: "Institution Media Pass",
    layout: "gallery",
    ink: "#1e3a8a",
    paper: "#ffffff",
    text: "#1e293b",
    muted: "#64748b",
    rule: "#93c5fd",
    pressMark: "#1d4ed8",
    pressMarkText: "#ffffff",
  },
  {
    id: "checkpoint_media",
    nameKu: "باجی چاودێری",
    nameEn: "Checkpoint Media ID",
    layout: "checkpoint",
    ink: "#0c4a6e",
    paper: "#ffffff",
    text: "#0f172a",
    muted: "#475569",
    rule: "#64748b",
    pressMark: "#b91c1c",
    pressMarkText: "#ffffff",
  },
];

export const DEFAULT_PRESS_BADGE: PressBadgeData = {
  designId: "ifj_standard",
  organization: "",
  holderName: "",
  title: "ڕۆژنامەنووس",
  mediaOutlet: "",
  badgeId: "",
  validFrom: "",
  validTo: "",
  frontNote: "Accredited working journalist",
  backNote:
    "This credential identifies the bearer as a working journalist. Please facilitate legitimate newsgathering in accordance with applicable law.",
  emergencyPhone: "",
  website: "",
  photoDataUrl: null,
  logoDataUrl: null,
  customPrimary: "#003087",
  customAccent: "#b91c1c",
  useCustomColors: false,
};

export function resolvePressBadgeColors(
  design: PressBadgeDesign,
  data: PressBadgeData,
): PressBadgeDesign {
  if (!data.useCustomColors) return design;
  return {
    ...design,
    ink: data.customPrimary || design.ink,
    pressMark: data.customAccent || design.pressMark,
  };
}
