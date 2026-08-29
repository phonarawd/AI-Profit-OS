/**
 * PUTDUK token SSOT — hex는 여기와 foundation CSS만.
 * 과거 보라색 권위는 사용하지 않는다.
 */
export const putdukTokens = {
  color: {
    bg: "#F6F7FB",
    surface: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E1E6EE",
    text: "#121721",
    textMuted: "#5D6675",
    accent: "#FF2D6B",
    accentMuted: "#FF6A91",
    danger: "#F04438",
    warning: "#F79009",
    profit: "#12B76A",
    principal: "#FF2D6B",
    navy: "#07101D",
    heroGradientFrom: "#07101D",
    heroGradientTo: "#FF2D6B",
  },
  motion: {
    ctaPulseMs: 200,
    countUpMs: 400,
    reducedMotion: "prefers-reduced-motion: reduce",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    pill: "999px",
  },
  shadow: {
    card: "0 1px 2px rgba(18,23,33,0.06), 0 8px 24px rgba(7,16,29,0.06)",
    soft: "0 1px 3px rgba(18,23,33,0.04)",
    floating: "0 8px 26px rgba(7,16,29,0.12)",
  },
  fontScale: {
    md: { factor: 1.0, lineHeightBoost: 0 },
    lg: { factor: 1.15, lineHeightBoost: 0.05 },
    xl: { factor: 1.3, lineHeightBoost: 0.1 },
  },
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
    sidebar: "220px",
    rightRailMin: "320px",
    rightRailMax: "360px",
    rightRailDefault: "352px",
    header: "64px",
    contentRailMax: "1680px",
    heroDesktopMin: "480px",
    heroDesktopMax: "600px",
    heroMobileMin: "320px",
    heroMobileMax: "420px",
  },
  touch: {
    minPx: 48,
  },
  image: {
    cardAspectRatio: "1 / 1",
  },
  theme: {
    mode: "putduk-premium" as const,
    lightToggleAllowed: false,
    systemToggleAllowed: false,
  },
} as const;

export type PutdukTokens = typeof putdukTokens;
export type FontScaleKey = keyof typeof putdukTokens.fontScale;
