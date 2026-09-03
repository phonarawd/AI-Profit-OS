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
  /** Guest utility — 차익/$ 수익 암시 0 */
  demoPriceExample: "시세 비교 예시",
  practiceHeadline: "🎁 연습 잔액으로 흐름을 익혀 보세요",
  partnerSlideLead: "🤝 시세·데이터 출처를 확인해요",
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
  demoLabel: "체험용 예시",
  demoNotLive: "실시간 확정 결과가 아닙니다",
  marketDiffTitle: "어디서 더 유리한지 한눈에 확인",
  marketA: "시장 A 시세 예시",
  marketB: "시장 B 시세 예시",
  marketDiffHint: "숫자는 체험용이에요. 실제 시세가 아닙니다",
  matchTitle: "같은 상품을 자동으로 연결",
  matchHint: "여러 시장의 같은 상품을 이어 보여 드려요",
  buyingPowerTitle: "준비한 금액 범위 안에서 참여",
  buyingPowerBody:
    "이 체험에는 준비 금액을 넣지 않았어요. 실제 기회에서는 필요한 금액을 분명히 보여 드려요.",
  buyingPowerUnavailable: "준비 금액을 아직 확인할 수 없어요",
  opportunityDemoTitle: "실제 서비스에서는 이렇게 기회를 확인해요",
  continueReal: "실제 서비스 보기",
  back: "이전",
} as const;

export type OnboardingCopy = typeof onboarding;
