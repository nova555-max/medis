/**
 * Standard journalism press-pass templates.
 * Oriented like real lanyard credentials (portrait), institutional typography,
 * clear photo + PRESS mark + org branding — not decorative gimmicks.
 */
export type PressBadgeDesignId =
  | "wire_service"
  | "broadcast_pass"
  | "ifj_style"
  | "event_media"
  | "photo_desk"
  | "foreign_corr"
  | "security_media"
  | "editorial_card"
  | "field_reporter"
  | "network_credential";

export type PressBadgeLayout =
  | "wire"
  | "broadcast"
  | "ifj"
  | "event"
  | "photo"
  | "foreign"
  | "security"
  | "editorial"
  | "field"
  | "network";

export type PressBadgeDesign = {
  id: PressBadgeDesignId;
  nameCkb: string;
  nameEn: string;
  layout: PressBadgeLayout;
  /** Header / institutional band */
  primary: string;
  /** PRESS mark / emphasis */
  accent: string;
  surface: string;
  ink: string;
  muted: string;
  secondary?: string;
};

export const PRESS_BADGE_DESIGNS: PressBadgeDesign[] = [
  {
    id: "wire_service",
    nameCkb: "باجی ئاژانس (Wire)",
    nameEn: "Wire Service",
    layout: "wire",
    primary: "#1A1A1A",
    accent: "#C41E3A",
    surface: "#FFFFFF",
    ink: "#111111",
    muted: "#555555",
    secondary: "#F3F3F3",
  },
  {
    id: "broadcast_pass",
    nameCkb: "باجی پەخش",
    nameEn: "Broadcast Pass",
    layout: "broadcast",
    primary: "#003366",
    accent: "#FF6600",
    surface: "#FFFFFF",
    ink: "#0A1628",
    muted: "#5A6A7A",
    secondary: "#E8EEF5",
  },
  {
    id: "ifj_style",
    nameCkb: "ستانداردی نێودەوڵەتی",
    nameEn: "International Card",
    layout: "ifj",
    primary: "#003399",
    accent: "#FFCC00",
    surface: "#FFFFFF",
    ink: "#001A4D",
    muted: "#4A5568",
    secondary: "#E6EEFF",
  },
  {
    id: "event_media",
    nameCkb: "باجی ڕووداو / کۆنفرانس",
    nameEn: "Event Media",
    layout: "event",
    primary: "#0D47A1",
    accent: "#D32F2F",
    surface: "#FAFAFA",
    ink: "#212121",
    muted: "#616161",
    secondary: "#1565C0",
  },
  {
    id: "photo_desk",
    nameCkb: "باجی وێنەگر",
    nameEn: "Photo Desk",
    layout: "photo",
    primary: "#212121",
    accent: "#FFC107",
    surface: "#FAFAFA",
    ink: "#121212",
    muted: "#666666",
    secondary: "#424242",
  },
  {
    id: "foreign_corr",
    nameCkb: "پەیامنێری دەرەوە",
    nameEn: "Foreign Correspondent",
    layout: "foreign",
    primary: "#1B4D3E",
    accent: "#C9A227",
    surface: "#FFFEF8",
    ink: "#1A2E28",
    muted: "#5C6B64",
    secondary: "#E8F0EC",
  },
  {
    id: "security_media",
    nameCkb: "باجی ئاسایشی میدیا",
    nameEn: "Security Media",
    layout: "security",
    primary: "#263238",
    accent: "#00ACC1",
    surface: "#ECEFF1",
    ink: "#102027",
    muted: "#546E7A",
    secondary: "#37474F",
  },
  {
    id: "editorial_card",
    nameCkb: "کارتی سەرنووسەرایەتی",
    nameEn: "Editorial Card",
    layout: "editorial",
    primary: "#3E2723",
    accent: "#8D6E63",
    surface: "#FFF8F0",
    ink: "#2D1F1A",
    muted: "#6D4C41",
    secondary: "#EFEBE9",
  },
  {
    id: "field_reporter",
    nameCkb: "ڕیپۆرتەری مەیدان",
    nameEn: "Field Reporter",
    layout: "field",
    primary: "#B71C1C",
    accent: "#FFFFFF",
    surface: "#FFFFFF",
    ink: "#1A1A1A",
    muted: "#616161",
    secondary: "#FFEBEE",
  },
  {
    id: "network_credential",
    nameCkb: "ناسنامەی تۆڕی میدیا",
    nameEn: "Network Credential",
    layout: "network",
    primary: "#0D1B2A",
    accent: "#E0E1DD",
    surface: "#F8F9FA",
    ink: "#0D1B2A",
    muted: "#415A77",
    secondary: "#1B263B",
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
  notes:
    "This credential identifies the bearer as an accredited journalist. Valid only with photo ID.",
  pressWord: "PRESS",
  primaryOverride: "",
  accentOverride: "",
  logoDataUrl: null,
  photoDataUrl: null,
  designId: "wire_service",
};
