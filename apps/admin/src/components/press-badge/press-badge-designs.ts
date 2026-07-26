export type PressBadgeDesignId =
  | "navy_classic"
  | "crimson_flash"
  | "charcoal_minimal"
  | "gold_prestige"
  | "teal_broadcast"
  | "ink_broadsheet"
  | "emerald_field"
  | "amber_deadline"
  | "violet_lens"
  | "slate_wire";

export type PressBadgeDesign = {
  id: PressBadgeDesignId;
  nameCkb: string;
  nameEn: string;
  /** Primary panel / header */
  primary: string;
  /** Accent stripe / PRESS mark */
  accent: string;
  /** Card background */
  surface: string;
  /** Main text */
  ink: string;
  /** Muted text */
  muted: string;
  /** PRESS word style */
  pressStyle: "banner" | "stamp" | "outline" | "ribbon" | "vertical";
  frontPattern: "none" | "dots" | "lines" | "grid" | "diagonal";
  backPattern: "none" | "dots" | "lines" | "grid" | "diagonal";
  radius: "sharp" | "soft" | "pill";
};

export const PRESS_BADGE_DESIGNS: PressBadgeDesign[] = [
  {
    id: "navy_classic",
    nameCkb: "نیلی کلاسیک",
    nameEn: "Navy Classic",
    primary: "#1B3A5F",
    accent: "#C9A227",
    surface: "#F7F4EE",
    ink: "#142033",
    muted: "#5C6B7A",
    pressStyle: "banner",
    frontPattern: "lines",
    backPattern: "dots",
    radius: "soft",
  },
  {
    id: "crimson_flash",
    nameCkb: "سووری میدیا",
    nameEn: "Crimson Flash",
    primary: "#8B1E2D",
    accent: "#F2E8D5",
    surface: "#FFF8F6",
    ink: "#2A1216",
    muted: "#7A4A52",
    pressStyle: "stamp",
    frontPattern: "diagonal",
    backPattern: "none",
    radius: "sharp",
  },
  {
    id: "charcoal_minimal",
    nameCkb: "ڕەشی مینیمال",
    nameEn: "Charcoal Minimal",
    primary: "#1F1F1F",
    accent: "#E8E4DC",
    surface: "#FAFAF8",
    ink: "#111111",
    muted: "#6B6B6B",
    pressStyle: "outline",
    frontPattern: "none",
    backPattern: "lines",
    radius: "sharp",
  },
  {
    id: "gold_prestige",
    nameCkb: "زێڕی پرستیژ",
    nameEn: "Gold Prestige",
    primary: "#2C2416",
    accent: "#C6A15B",
    surface: "#FBF6EA",
    ink: "#2C2416",
    muted: "#7A6A4A",
    pressStyle: "ribbon",
    frontPattern: "dots",
    backPattern: "dots",
    radius: "soft",
  },
  {
    id: "teal_broadcast",
    nameCkb: "شینـسەوزی پەخش",
    nameEn: "Teal Broadcast",
    primary: "#0F4C5C",
    accent: "#E36414",
    surface: "#F3FAFB",
    ink: "#0B2E36",
    muted: "#4D6E76",
    pressStyle: "banner",
    frontPattern: "grid",
    backPattern: "none",
    radius: "soft",
  },
  {
    id: "ink_broadsheet",
    nameCkb: "ڕۆژنامەی ڕەشوسپی",
    nameEn: "Ink Broadsheet",
    primary: "#111827",
    accent: "#111827",
    surface: "#F5F5F0",
    ink: "#111827",
    muted: "#4B5563",
    pressStyle: "vertical",
    frontPattern: "lines",
    backPattern: "lines",
    radius: "sharp",
  },
  {
    id: "emerald_field",
    nameCkb: "زەمری مەیدانی",
    nameEn: "Emerald Field",
    primary: "#14532D",
    accent: "#FDE68A",
    surface: "#F4FBF6",
    ink: "#052E16",
    muted: "#3F6B4E",
    pressStyle: "stamp",
    frontPattern: "none",
    backPattern: "grid",
    radius: "soft",
  },
  {
    id: "amber_deadline",
    nameCkb: "کەهڕەبایی دەدلاین",
    nameEn: "Amber Deadline",
    primary: "#9A3412",
    accent: "#1C1917",
    surface: "#FFF7ED",
    ink: "#1C1917",
    muted: "#78716C",
    pressStyle: "ribbon",
    frontPattern: "diagonal",
    backPattern: "dots",
    radius: "pill",
  },
  {
    id: "violet_lens",
    nameCkb: "مۆری لینز",
    nameEn: "Violet Lens",
    primary: "#3B0764",
    accent: "#F5D0FE",
    surface: "#FBF5FF",
    ink: "#2E1065",
    muted: "#6B7280",
    pressStyle: "outline",
    frontPattern: "dots",
    backPattern: "none",
    radius: "soft",
  },
  {
    id: "slate_wire",
    nameCkb: "سلێتی وایر",
    nameEn: "Slate Wire",
    primary: "#334155",
    accent: "#38BDF8",
    surface: "#F8FAFC",
    ink: "#0F172A",
    muted: "#64748B",
    pressStyle: "banner",
    frontPattern: "grid",
    backPattern: "lines",
    radius: "soft",
  },
];

export function getPressDesign(id: PressBadgeDesignId): PressBadgeDesign {
  return (
    PRESS_BADGE_DESIGNS.find((d) => d.id === id) || PRESS_BADGE_DESIGNS[0]!
  );
}

export type PressBadgeData = {
  fullName: string;
  title: string;
  organization: string;
  badgeId: string;
  issuedAt: string;
  expiresAt: string;
  phone: string;
  email: string;
  bloodType: string;
  notes: string;
  pressWord: string;
  primaryOverride: string;
  accentOverride: string;
  logoDataUrl: string | null;
  photoDataUrl: string | null;
  designId: PressBadgeDesignId;
};

export const DEFAULT_PRESS_BADGE: PressBadgeData = {
  fullName: "",
  title: "ڕۆژنامەنووس",
  organization: "",
  badgeId: "",
  issuedAt: new Date().toISOString().slice(0, 10),
  expiresAt: "",
  phone: "",
  email: "",
  bloodType: "",
  notes: "ئەم ناسنامەیە تەنها بۆ مەبەستی ڕۆژنامەنووسی بەکاردێت.",
  pressWord: "PRESS",
  primaryOverride: "",
  accentOverride: "",
  logoDataUrl: null,
  photoDataUrl: null,
  designId: "navy_classic",
};
