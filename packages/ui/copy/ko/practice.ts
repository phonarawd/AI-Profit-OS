/**
 * T.practice — Money §51.7 · Demo onboarding banner · non-withdrawable
 * JSX 하드코딩 금지 · practice→profit 승격 카피 0
 */
export const practice = {
  badge: "연습",
  bannerTitle: "연습·미리보기 · 출금 아님",
  bannerBody:
    "연습 잔액은 미리 써보는 금액이에요. 출금하거나 실제 수익으로 바꿀 수 없어요.",
  notWithdrawable: "연습 잔액은 출금할 수 없어요",
  expiredToast: "⏰ 연습 잔액이 만료됐어요",
  grantedToast: "🎁 연습 잔액이 생겼어요. 출금은 안 돼요",
  adminNote: "연습 버킷 · 출금·참여·수익 승격 불가",
} as const;

export type PracticeCopy = typeof practice;
