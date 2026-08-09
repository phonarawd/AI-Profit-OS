/**
 * Lux-Fintech token SSOT (ADR-013 · ADR-015 · PART1d)
 * Hex values live ONLY here (+ lux-theme.css @theme mirror).
 * UI surfaces must not hardcode brand colors.
 * Do NOT reinvent hex — Brand Kit visual_kit_v1 lock.
 */
export const luxFintech = {
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
  motion: {
    ctaPulseMs: 1600,
    countUpMs: 900,
    reducedMotion: "prefers-reduced-motion: reduce",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
  },
  /** §50.1 fontScale 3단 · md baseline = 1 */
  fontScale: {
    md: { factor: 1.0, lineHeightBoost: 0 },
    lg: { factor: 1.15, lineHeightBoost: 0.05 },
    xl: { factor: 1.3, lineHeightBoost: 0.1 },
  },
  /** Senior / xl contrast helpers — Light theme toggle forbidden */
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
  touch: {
    minPx: 48,
  },
  image: {
    /** Card product thumb — CLS lock */
    cardAspectRatio: "1 / 1",
  },
  theme: {
    mode: "lux-dark" as const,
    lightToggleAllowed: false,
    systemToggleAllowed: false,
  },
} as const;

export type LuxFintech = typeof luxFintech;
export type FontScaleKey = keyof typeof luxFintech.fontScale;
