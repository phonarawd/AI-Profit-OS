/**
 * T.opportunity.* — UI §5.3b · §48.9 · Engine §4.2b 표기
 * arbitrageTypeKo = Engine §4.2a 투영 · UI 하드코딩 맵 금지
 * expectedSellDays / 기간 N일 유저 카드 슬롯 0
 * executionPlatforms 유저 0 · PriceCompare = 저가/고가 시세 (매입가/판매가 금지)
 */
export const opportunity = {
  detailTitle: "수익 상세",
  badgeMatchable: "AI 매칭 가능",
  historicalMatchHint: "과거 유사 매칭",
  historicalWindow: "최근 {n}일 기준",
  historicalAsOf: "업데이트 {relative}",
  labelRequiredCapital: "필요 자본",
  labelExpectedProfit: "예상 수익",
  /** Admin/historical only — 유저 카드 노출 0 (Index §20.2) */
  labelExpectedTurn: "예상 처리기간",
  labelAiConfidence: "AI 매칭 적합도",
  /** Engine §4.2b / §0.0.4 PriceCompare — buyPriceUsdt / sellPriceUsdt */
  labelPriceLow: "저가 시세",
  labelPriceHigh: "고가 시세",
  corridor: "{buy} → {sell} {type} 기회",
  /** Engine §0.0.5 CATEGORY_FILTER_CHIPS · layout Owns=UI §5.3b */
  filterCategoryAll: "전체",
  filterCategoryWatch: "시계",
  filterCategoryCard: "카드",
  filterCategoryBag: "가방",
} as const;

export type OpportunityCopy = typeof opportunity;
