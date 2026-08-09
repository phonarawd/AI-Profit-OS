/**
 * T.onboarding.* — §6.4 · §38.9 toneBand · §27.10 · v7.22.55 Guest utility
 * Guest/광고유입: 수익|투자|USDT|테더|보장|차익|괴리율 0
 */
export const onboarding = {
  next: "다음",
  skip: "건너뛰기",
  startApp: "시작하기",
  identityHeadline: "✨ 글로벌 시세·가격을 비교해 보여 드려요",
  demoHeadline: "👆 연습으로 한 번 눌러 보세요",
  demoHint: "연습 카드 한 장을 눌러 흐름을 느껴 보세요",
  tryDemoCard: "연습 카드 눌러보기",
  demoPreviewTitle: "연습 미리보기",
  demoPreviewBody: "실제 출금·정산은 없어요. 흐름만 익혀 보세요.",
  practiceHeadline: "🎁 연습 잔액으로 흐름을 익혀 보세요",
  partnerSlideLead: "🤝 공식 협력사 시세를 참고해요",
  usdtHeadline: "🪙 왜 이 충전 방식인가요?",
  usdtBody: "해외 시세 비교 흐름에 맞춰, 충전·정산 방식을 나중에 안내해요.",
  usdtWhyLink: "충전 안내 이어보기",
  usdtNoTether: "아직 준비 안 됐어요",
  payoutDepositLink: "충전 화면으로",
  actionHeadline: "💰 준비되면 시세 맵을 이어서 보세요",
  payoutHeadline: "🎉 연습 준비가 끝났어요",
  payoutBody: "지갑에서 충전 방식을 고르고 바로 시작할 수 있어요",
  tonePickTitle: "📖 설명 방식을 골라 주세요",
  toneYoung: "짧게",
  toneMid: "비교로",
  toneSenior: "한 줄씩",
  young: {
    identityBody: "두 시장의 가격을 나란히 보여 드려요 ✨",
    tip: "💡 숫자는 시장에 따라 달라질 수 있어요",
  },
  mid: {
    identityBody: "해외 두 곳의 시세를 비교해 차이를 보여 드려요.",
    tip: "💡 조건이 안 맞으면 안전하게 멈춰요",
  },
  senior: {
    identityBody: "💡 다른 나라 가격을 비교해 보여 드려요.",
    tip: "한 줄씩 읽어 주세요. 다음을 누르면 이어져요.",
    nextConfirm: "다음으로 갈까요?",
  },
} as const;

export type OnboardingCopy = typeof onboarding;
