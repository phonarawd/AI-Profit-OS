/** T.margin.* — PriceCompareMargin skeleton · formula Owns=Engine §0.0.4 */
export const margin = {
  compareMini: "시세 비교 · 예상 차익",
  /** Guest onboarding/landing — §6.4c.1 utility · 차익 라벨 0 */
  compareMiniUtility: "시세·가격 비교",
  compareReady: "시세 준비됨",
  comparePending: "시세 불러오는 중…",
} as const;

export type MarginCopy = typeof margin;
