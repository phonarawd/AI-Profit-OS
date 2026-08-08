/**
 * Lux-Fintech token SSOT (ADR-013 · ADR-015)
 * Hex values live ONLY here (+ lux-theme.css @theme mirror).
 * UI surfaces must not hardcode brand colors.
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
} as const;

export type LuxFintech = typeof luxFintech;
