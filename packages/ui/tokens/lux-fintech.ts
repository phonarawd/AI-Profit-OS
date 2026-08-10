/**
 * Peotteok Light token SSOT (ADR-017 · STEP4 Theme Cutover)
 * Hex values live ONLY here (+ lux-theme.css @theme mirror).
 * UI surfaces must not hardcode brand colors.
 *
 * Shipping theme = peotteok-light.
 * lux-dark = archive/legacy only (dual theme Day-1 = 0).
 */
export const luxFintech = {
  color: {
    bg: "#F6F4FC",
    surface: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E4E0F0",
    text: "#14121F",
    textMuted: "#6B6680",
    accent: "#6B3CFF",
    accentMuted: "#8B6CFF",
    danger: "#F04438",
    warning: "#F79009",
    profit: "#12B76A",
    principal: "#6B3CFF",
    heroGradientFrom: "#2B1B6B",
    heroGradientTo: "#5B3CFF",
  },
  motion: {
    ctaPulseMs: 1600,
    /** Forbidden on Home trust surfaces (Contract Animation Lock) */
    countUpMs: 900,
    reducedMotion: "prefers-reduced-motion: reduce",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
  },
  shadow: {
    card: "0 1px 2px rgba(20,18,31,0.06), 0 4px 16px rgba(107,60,255,0.06)",
    soft: "0 1px 3px rgba(20,18,31,0.04)",
  },
  /** §50.1 fontScale 3단 · md baseline = 1 */
  fontScale: {
    md: { factor: 1.0, lineHeightBoost: 0 },
    lg: { factor: 1.15, lineHeightBoost: 0.05 },
    xl: { factor: 1.3, lineHeightBoost: 0.1 },
  },
  /** Senior / xl contrast helpers — Light/system theme toggle forbidden */
  senior: {
    lineHeight: 1.65,
    letterSpacing: "0.01em",
    textContrastBoost: true,
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  layout: {
    sidebar: "240px",
    rightRailMin: "320px",
    rightRailMax: "360px",
    header: "64px",
    heroDesktopMin: "480px",
    heroDesktopMax: "560px",
    heroMobileMin: "320px",
    heroMobileMax: "420px",
  },
  touch: {
    minPx: 48,
  },
  image: {
    /** Card product thumb — CLS lock */
    cardAspectRatio: "1 / 1",
  },
  theme: {
    mode: "peotteok-light" as const,
    lightToggleAllowed: false,
    systemToggleAllowed: false,
  },
} as const;

/**
 * Lux Dark archive (ADR-017) — not shipping. Dual theme toggle forbidden.
 * Kept for historical reference / rollback research only.
 */
export const luxFintechLegacyDark = {
  color: {
    bg: "#090A10",
    surface: "#12141C",
    elevated: "#1A1D28",
    border: "#2A2F3D",
    text: "#F2F4F8",
    textMuted: "#9AA3B5",
    accent: "#3DDC97",
    accentMuted: "#2A9B6C",
    danger: "#FF5C7A",
    warning: "#F5C542",
    profit: "#3DDC97",
    principal: "#7AA2FF",
  },
  theme: {
    mode: "lux-dark" as const,
    lightToggleAllowed: false,
    systemToggleAllowed: false,
  },
} as const;

/** @deprecated Alias of luxFintechLegacyDark */
export const luxDarkArchive = luxFintechLegacyDark;

export type LuxFintech = typeof luxFintech;
export type FontScaleKey = keyof typeof luxFintech.fontScale;
