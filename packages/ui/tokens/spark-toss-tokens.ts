/**
 * Spark Dash × Toss Premium 의미 토큰 (UI-1 foundation).
 * 신규 UI의 색·간격·타이포·모션 SSOT. 앱 화면에 아직 적용하지 않는다.
 *
 * 금지: 레거시 디자인 토큰 값 복사, CSS 변수 alias, 컴포넌트 wrapper 재사용.
 * luxury_bag 상품 도메인과 무관하다.
 */
export const SPARK_TOSS_TOKEN_VERSION = "1.0.0" as const;
export const SPARK_TOSS_NAMESPACE = "spark-toss" as const;

/** Toss-like 신뢰 블루 + Spark 진행 틸. 레거시 퍼플/라벤더 팔레트와 겹치지 않는다. */
export const sparkTossColor = {
  canvas: "#F4F6F8",
  surface: "#FFFFFF",
  elevatedSurface: "#FFFFFF",
  textPrimary: "#191F28",
  textSecondary: "#4E5968",
  textMuted: "#8B95A1",
  brandPrimary: "#2F6BFF",
  brandAccent: "#00B4A6",
  borderSubtle: "#E5E8EB",
  borderStrong: "#C9D0D8",
  positive: "#009A6A",
  caution: "#E69500",
  critical: "#E11D48",
  information: "#2F6BFF",
  focusRing: "#2F6BFF",
  disabled: "#B8BFC8",
  overlay: "rgba(25, 31, 40, 0.48)",
} as const;

export const sparkTossTypography = {
  display: { sizePx: 32, lineHeight: 1.25, weight: 700, letterSpacing: "-0.02em" },
  pageTitle: { sizePx: 24, lineHeight: 1.35, weight: 700, letterSpacing: "-0.015em" },
  sectionTitle: { sizePx: 18, lineHeight: 1.4, weight: 650, letterSpacing: "-0.01em" },
  body: { sizePx: 16, lineHeight: 1.55, weight: 500, letterSpacing: "0" },
  supporting: { sizePx: 14, lineHeight: 1.5, weight: 500, letterSpacing: "0" },
  label: { sizePx: 13, lineHeight: 1.4, weight: 600, letterSpacing: "0.01em" },
  number: { sizePx: 22, lineHeight: 1.2, weight: 700, letterSpacing: "-0.02em", tabular: true },
  caption: { sizePx: 12, lineHeight: 1.45, weight: 500, letterSpacing: "0" },
  fontFamily:
    '"Pretendard Variable", "Pretendard", "Noto Sans KR", ui-sans-serif, system-ui, sans-serif',
} as const;

export const sparkTossLayout = {
  spacing: {
    2: "2px",
    4: "4px",
    8: "8px",
    12: "12px",
    16: "16px",
    20: "20px",
    24: "24px",
    32: "32px",
    40: "40px",
    48: "48px",
  },
  container: {
    narrow: "480px",
    readable: "720px",
    page: "1080px",
    wide: "1280px",
  },
  gutter: {
    compact: "16px",
    default: "20px",
    comfortable: "24px",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "18px",
    pill: "999px",
  },
  elevation: {
    none: "none",
    rest: "0 1px 2px rgba(25, 31, 40, 0.06)",
    raised: "0 4px 14px rgba(25, 31, 40, 0.08)",
    overlay: "0 12px 32px rgba(25, 31, 40, 0.14)",
  },
  touchTargetPx: 44,
  safeArea: {
    top: "env(safe-area-inset-top)",
    right: "env(safe-area-inset-right)",
    bottom: "env(safe-area-inset-bottom)",
    left: "env(safe-area-inset-left)",
  },
  density: {
    compact: 0.92,
    default: 1,
    comfortable: 1.12,
  },
} as const;

export const sparkTossMotion = {
  duration: {
    instantMs: 80,
    feedbackMs: 140,
    enterMs: 180,
    exitMs: 140,
    settleMs: 240,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    enter: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
  reducedMotion: {
    query: "(prefers-reduced-motion: reduce)",
    durationMs: 1,
    disableLoop: true,
    opacityOnly: true,
  },
} as const;

export const sparkTossTokens = {
  version: SPARK_TOSS_TOKEN_VERSION,
  namespace: SPARK_TOSS_NAMESPACE,
  designDirection: {
    sparkDash: ["energy", "progress", "living-data-rhythm", "restrained-accent"],
    tossPremium: ["wide-space", "one-judgment", "trust", "plain-korean"],
  },
  color: sparkTossColor,
  typography: sparkTossTypography,
  layout: sparkTossLayout,
  motion: sparkTossMotion,
} as const;

export type SparkTossTokens = typeof sparkTossTokens;
export type SparkTossColorName = keyof typeof sparkTossColor;
export type SparkTossTypeRole = keyof Omit<typeof sparkTossTypography, "fontFamily">;
