/**
 * T.ticker.* — UI §33.2a PublicTicker surface
 * {name}=displayLabel (already masked) · casino/대박/당첨 0
 */
export const ticker = {
  justSettled: "방금 {name}님이 +{amount} 정산했어요",
  justReflected: "방금 {name}님 수익이 반영됐어요",
  participantAmt: "{name}님이 +{amount} 참여했어요",
  regionAria: "실시간 수익 소식",
  /** Forbidden phrases in ticker body (verify:ticker-pii-0) */
  forbiddenPhrases: ["100만", "대박", "당첨", "잭팟"] as const,
} as const;

export type TickerCopy = typeof ticker;
