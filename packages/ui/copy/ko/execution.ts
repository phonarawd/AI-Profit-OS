/**
 * T.execution.* — UI §48.9 · Index §20.2 (CTA · 면책 · Soft/Hard · 긴장감)
 * JSX 하드코딩 금지 · 유저 Primary = 수익 벌기 (domain=participate)
 */
export const execution = {
  ctaEarn: "수익 벌기",
  ctaDetail: "이 기회로 수익 벌기",
  ctaDepositEarn: "입금하고 수익 벌기",
  ctaStickyShort: "수익 벌기",
  ctaHeroToday: "오늘 수익 벌기",

  disclaimerResult: "예상 결과는 시장 상황에 따라 달라질 수 있습니다.",
  badgeNoBuy: "직접 사지 않아요",
  badgeNoSell: "직접 팔지 않아요",
  badgeNoBid: "직접 입찰·판매 안 함",

  /** Soft/Hard 유저 카피 3줄 (v7.22.29 · 고정) */
  slaSoftHint: "보통 1분 안에 결과가 나와요",
  requeueHint: "조건을 다시 맞추는 중이에요 · 손댈 것 없음",
  matchTimeout: "시간이 지나 안전하게 멈췄어요 · 잔액은 그대로예요",

  /** §48.3b 긴장감 */
  slaAlmost: "거의 다 됐어요 · 마지막 조건 확인 중",
  priceNearMiss: "시세가 살짝 어긋났어요",

  progressTitle: "AI가 기회를 찾는 중",
  progressHandsFree: "손댈 것 없음",
  /** Engine §4.2b · factSource 있을 때만 슬롯 노출 */
  progressWaiters: "현재 대기자 {n}명",
  progressMatchable: "매칭 가능 기회 {n}개",
  /** executionMode=orchestrate 유저 표기 (실체결/직접입찰 암시 0) */
  executionModeHint: "AI 자동 처리",
  executionModeBody: "AI가 조건을 맞춰 처리",
  imageRightsNote: "시세 참고용 · 기회 근거",
  logLine: "{time} {message}",

  steps: [
    { key: "confirm", active: "투입 금액 확인 중...", done: "투입 금액 확인" },
    { key: "quote", active: "시세 불러오는 중...", done: "시세·조건 확인" },
    { key: "match", active: "AI 매칭 중...", done: "매칭 완료" },
    { key: "settle", active: "처리·정산 중...", done: "정산 준비" },
    { key: "credit", active: "지갑으로 지급 중...", done: "지갑 지급" },
  ],

  cancel: "그만두기",
  successTitle: "수익이 들어왔어요",
  successBadge: "확정 지급",
  successAiDone: "AI 처리 완료",
  successBalance: "내 잔액에 반영됐어요",
  successBalanceSub: "지금 바로 확인해보세요",
  successPrimary: "확인 · 지갑 보기",
  successSecondary: "다른 기회 보기",
  withdrawProfit: "수익만 출금",
  profitAmount: "+{settledUsdt} USDT",
  shareBoast: "자랑하기",
  /** Canon wire alias → successBadge */
  settledBadge: "확정 지급",
  /** Canon wire alias → badgeNoBid */
  noBidBadge: "직접 입찰·판매 안 함",

  safeTitle: "이번엔 안전하게 멈췄어요",
  safeBody:
    "조건이 맞지 않아 매칭하지 않았어요. 손해 나지 않게 AI가 중단했습니다.",
  safeBalance: "잔액은 그대로예요",
  safeChip: "시세 변동 · 수익 미달 방지",
  safeExpectedNotPaid: "지급 안 됨",
  safePrimary: "비슷한 기회 보기",
  safeSecondary: "홈으로",
  safeRecommend: "AI 추천 기회",
  /** Canon wire aliases */
  safeStopTitle: "이번엔 안전하게 멈췄어요",
  safeStopReason:
    "조건이 맞지 않아 매칭하지 않았어요. 손해 나지 않게 AI가 중단했습니다.",
  balanceUnchanged: "잔액은 그대로예요",
  browseOther: "비슷한 기회 보기",
  recommendCards: "AI 추천 기회",

  adminTitle: "AI 진행 정책",
  adminLedgerSplit: "장부(실돈)와 연출은 분리됨",
  adminRealCol: "실조건",
  adminPresentCol: "화면 연출만",
  adminForbidRng: "금지: 난수 성공률",
  adminForbidRngHelp: "잔액 지급과 무관한 난수 성공률 사용 금지",
  adminPresentWarn: "연출이 ledger 입금 성공률을 바꾸지 않음",
} as const;

export type ExecutionCopy = typeof execution;
