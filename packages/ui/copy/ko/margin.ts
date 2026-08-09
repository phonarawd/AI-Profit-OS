/**
 * T.margin.* — PriceCompareMargin · formula Owns=Engine §0.0.4
 * UI는 라벨·표시만 · 재계산 금지
 */
export const margin = {
  compareMini: "시세 비교 · 예상 차익",
  /** Guest onboarding/landing — §6.4c.1 utility · 차익 라벨 0 */
  compareMiniUtility: "시세·가격 비교",
  compareReady: "시세 준비됨",
  comparePending: "시세 불러오는 중…",
  /** §38.7 Q1 증거 · Engine expectedProfitUsdt = 유저 마진 */
  labelUserMargin: "유저 마진",
  /** Engine platformMarginUsdt */
  labelPlatformMargin: "플랫폼 마진",
  /** 접힘 토글 */
  evidenceToggle: "기회 근거",
  evidenceHide: "기회 근거 접기",
} as const;

export type MarginCopy = typeof margin;
