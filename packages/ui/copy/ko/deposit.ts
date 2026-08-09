/**
 * T.deposit — Money §49.2a deposit surface (suggest prefill · quick chips).
 * Network plain-ko warning = T.wallet (§41.6).
 */
export const deposit = {
  pageTitle: "입금",
  tabUsdt: "USDT",
  tabKrw: "원화",
  amountLabel: "입금 금액",
  usdtSuffix: "USDT",
  quickHint: "빠른 선택",
  /** suggest chip label — {n} = suggestDepositUsdt */
  suggestChip: "+{n} USDT (이 기회)",
  suggestPrefillHint: "이 기회에 맞는 금액으로 채웠어요. 바꿔도 돼요.",
  /** KRW tab — suggest stays USDT units; amount is not forced */
  krwSuggestNote: "참고: 약 {n} USDT에 해당하는 원화를 신청하면 이 기회를 열 수 있어요",
  ctaContinue: "다음",
  optionalHint: "금액은 직접 바꿔도 돼요. 강제로 입금하지 않아요.",
} as const;

export type DepositCopy = typeof deposit;
