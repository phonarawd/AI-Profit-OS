/**
 * T.opportunity.* — UI §5.3b · §48.9
 * arbitrageTypeKo = Engine §4.2a 투영 · UI 하드코딩 맵 금지
 * expectedSellDays / 기간 N일 유저 카드 슬롯 0
 */
export const opportunity = {
  badgeMatchable: "AI 매칭 가능",
  historicalMatchHint: "과거 유사 매칭",
  historicalWindow: "최근 {n}일 기준",
  historicalAsOf: "업데이트 {relative}",
  labelRequiredCapital: "필요 자본",
  labelExpectedProfit: "예상 수익",
  /** Admin/historical only — 유저 카드 노출 0 (Index §20.2) */
  labelExpectedTurn: "예상 처리기간",
  labelAiConfidence: "AI 매칭 적합도",
  corridor: "{buy} → {sell} {type} 기회",
} as const;

export type OpportunityCopy = typeof opportunity;
