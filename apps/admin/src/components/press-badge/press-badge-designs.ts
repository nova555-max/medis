export type PressBadgeDesignId =
  | "hero_midnight"
  | "cinema_strip"
  | "masthead_ink"
  | "lanyard_clean"
  | "diagonal_pulse"
  | "gallery_frame"
  | "night_neon"
  | "field_pass"
  | "archive_stamp"
  | "lens_ring";

export type PressBadgeLayout =
  | "hero"
  | "cinema"
  | "masthead"
  | "lanyard"
  | "diagonal"
  | "gallery"
  | "neon"
  | "field"
  | "archive"
  | "lens";

export type PressBadgeDesign = {
  id: PressBadgeDesignId;
  nameCkb: string;
  nameEn: string;
  layout: PressBadgeLayout;
  primary: string;
  accent: string;
  surface: string;
  ink: string;
  muted: string;
  secondary?: string;
};

export const PRESS_BADGE_DESIGNS: PressBadgeDesign[] = [
  {
    id: "hero_midnight",
    nameCkb: "شەوی هیرۆ",
    nameEn: "Hero Midnight",
    layout: "hero",
    primary: "#0B1C2C",
    accent: "#E8B86D",
    surface: "#F4EFE6",
    ink: "#0B1C2C",
    muted: "#6A7A88",
    secondary: "#16324A",
  },
  {
    id: "cinema_strip",
    nameCkb: "شریتی سینەما",
    nameEn: "Cinema Strip",
    layout: "cinema",
    primary: "#111111",
    accent: "#F5C518",
    surface: "#1A1A1A",
    ink: "#F5F5F5",
    muted: "#A3A3A3",
    secondary: "#2A2A2A",
  },
  {
    id: "masthead_ink",
    nameCkb: "سەرپەڕەی ڕۆژنامە",
    nameEn: "Masthead Ink",
    layout: "masthead",
    primary: "#1A1A1A",
    accent: "#B91C1C",
    surface: "#F7F4EC",
    ink: "#1A1A1A",
    muted: "#5B5B5B",
    secondary: "#E7E1D4",
  },
  {
    id: "lanyard_clean",
    nameCkb: "پاک و مۆدێرن",
    nameEn: "Lanyard Clean",
    layout: "lanyard",
    primary: "#0F766E",
    accent: "#F97316",
    surface: "#FFFFFF",
    ink: "#134E4A",
    muted: "#64748B",
    secondary: "#CCFBF1",
  },
  {
    id: "diagonal_pulse",
    nameCkb: "لاری توند",
    nameEn: "Diagonal Pulse",
    layout: "diagonal",
    primary: "#7F1D1D",
    accent: "#FDE68A",
    surface: "#FFF7ED",
    ink: "#1C1917",
    muted: "#78716C",
    secondary: "#9A3412",
  },
  {
    id: "gallery_frame",
    nameCkb: "چوارچێوەی گەلەری",
    nameEn: "Gallery Frame",
    layout: "gallery",
    primary: "#292524",
    accent: "#A8A29E",
    surface: "#FAFAF9",
    ink: "#1C1917",
    muted: "#78716C",
    secondary: "#E7E5E4",
  },
  {
    id: "night_neon",
    nameCkb: "نیۆنی شەو",
    nameEn: "Night Neon",
    layout: "neon",
    primary: "#020617",
    accent: "#22D3EE",
    surface: "#0B1220",
    ink: "#E2E8F0",
    muted: "#94A3B8",
    secondary: "#F472B6",
  },
  {
    id: "field_pass",
    nameCkb: "پاسى مەیدان",
    nameEn: "Field Pass",
    layout: "field",
    primary: "#14532D",
    accent: "#FACC15",
    surface: "#ECFDF5",
    ink: "#052E16",
    muted: "#3F6212",
    secondary: "#166534",
  },
  {
    id: "archive_stamp",
    nameCkb: "مۆری ئەرشیف",
    nameEn: "Archive Stamp",
    layout: "archive",
    primary: "#44403C",
    accent: "#B45309",
    surface: "#F5F0E6",
    ink: "#292524",
    muted: "#78716C",
    secondary: "#D6D3D1",
  },
  {
    id: "lens_ring",
    nameCkb: "بازنەی کامێرا",
    nameEn: "Lens Ring",
    layout: "lens",
    primary: "#1E3A5F",
    accent: "#38BDF8",
    surface: "#F0F9FF",
    ink: "#0C4A6E",
    muted: "#64748B",
    secondary: "#075985",
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
  designId: "hero_midnight",
};
