/**
 * T.feed.* — UI §5.3a/b 잔액 인식 홈 · 기회스캔 카피
 * 분류·suggest = Engine §0.0.5.1 · principal = Money §49.2a
 */
export const feed = {
  homeTitle: "오늘 벌 수 있는 기회",
  homeScanSub: "AI가 지금 시장을 스캔했어요",
  /** §5.3 [B] HomePrincipalRail */
  balanceLabel: "내 잔액",
  balanceKrwApprox: "≈₩{amount}",
  balanceUsdtPrimary: "{n} USDT",
  balanceUsdtSecondary: "{n} USDT",
  ctaDeposit: "입금",
  /** §5.3 [D] */
  /** STEP5 Slice3 · density · 「가능」유지 · 실현/확정 금지 */
  todayPossibleProfitLabel: "오늘 가능 수익",
  todayPossibleProfitUsdt: "+{n} USDT",
  sectionAffordable: "지금 참여 가능",
  sectionAffordableCount: "내 자본으로 가능한 기회 {n}개",
  sectionNearMiss: "조금 더 넣으면",
  sectionLockedHigh: "더 큰 기회",
  ctaDepositSuggest: "+{n} USDT 넣고 열기",
  badgeNearMiss: "입금하면 가능",
  badgeLocked: "자본 부족",
  peotteokLine: "지금 잔액으로 {n}건 · +{s}USDT면 {m}건 더",
  /** P1 · tag time_sensitive · Day-1 칩 OFF 허용 */
  chipTimeSensitive: "마감 임박",
} as const;

export type FeedCopy = typeof feed;
