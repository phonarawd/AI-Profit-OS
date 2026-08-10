/**
 * T.walletBuckets / T.withdrawMode / T.successBucketCta — Money §49.8
 * JSX 하드코딩 금지 · 원금 출금 숨김·위협성 금지어 0 (§49.5)
 */
export const walletBuckets = {
  pageTitle: "지갑",
  totalLabel: "총 잔액",
  workingPrincipal: "근무 중 원금",
  withdrawableProfit: "출금 가능 수익",
  locked: "진행 중 잠금",
  practice: "연습 잔액",
  defaultProfitHint: "원금은 다음 수익에 쓰이고, 수익만 가져갈 수 있어요",
  principalAlways: "원금은 언제든 출금할 수 있어요",
  guideLink: "원금이 왜 필요해요?",
  usdtSuffix: "USDT",
  ctaDeposit: "입금하기",
  ctaWithdraw: "출금하기",
  historyLink: "입출금·수익 내역",
} as const;

export const withdrawMode = {
  pageTitle: "출금",
  pageTitleUsdt: "테더(USDT) 출금",
  pageTitleKrw: "원화 출금",
  tabUsdt: "테더(USDT)",
  tabKrw: "원화",
  modeProfit: "수익만",
  modeProfitHint: "기본 · 출금 가능 수익만",
  modePrincipal: "원금 포함",
  modePrincipalHint: "고급 · 확인 후 진행",
  modeCombined: "수익+원금",
  ctaProfitWithdraw: "수익 출금하기",
  ctaOpenPrincipal: "원금 출금하기",
  confirmTitle: "원금을 빼면",
  confirmBody:
    "참여 가능 상품이 줄어들 수 있어요. 지금 잔액으로 못 여는 기회가 있을 수 있어요.",
  confirmSelfOnly:
    "본인만 진행해 주세요. 다른 분 폰·계정에서는 출금하지 마세요.",
  ctaProfitOnly: "수익만 출금",
  ctaStillPrincipal: "그래도 원금 출금",
  amountLabel: "출금 금액",
  feeHint: "네트워크 수수료가 빠질 수 있어요",
  feeLine: "예상 수수료 {fee} USDT",
  destinationLabel: "받는 주소",
  destinationPlaceholder: "테더(USDT) 주소",
  stepUpTitle: "출금 확인",
  stepUpHint: "본인 확인 후 출금이 진행돼요",
  stepUpPinLabel: "출금 비밀번호",
  stepUpCodeLabel: "확인 코드",
  stepUpChallenge: "확인 요청",
  stepUpVerify: "확인하기",
  ctaSubmit: "출금 신청",
  submitOk: "출금 신청을 접수했어요",
  submitFail: "출금을 진행하지 못했어요. 잠시 후 다시 해 주세요",
} as const;

export const successBucketCta = {
  ctaProfitOnly: "수익만 출금",
  ctaMerge: "원금에 합치기",
  ctaLater: "나중에",
  emphasisDefault: "profit_withdraw",
} as const;

export const principalGuide = {
  pageTitle: "원금과 수익",
  whyKeep:
    "원금은 다음 기회에 바로 쓸 수 있는 근무 중 자본이에요. 수익만 출금해도 괜찮아요.",
  alwaysWithdraw: "원금도 언제든 출금할 수 있어요. 숨기거나 막지 않아요.",
  mergeHint: "수익을 원금에 합치면 더 큰 기회에 참여할 수 있어요.",
} as const;

/** Nested under T for wallet/withdraw surfaces */
export const principalProfit = {
  walletBuckets,
  withdrawMode,
  successBucketCta,
  principalGuide,
} as const;

export type PrincipalProfitCopy = typeof principalProfit;
