/**
 * T.landing.* — Canon landing-3s · Infra §31.2 · UI §6.4c.1 (v7.22.55)
 * utility-only · 수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바 0
 */
export const landing = {
  identityOneLiner: "✨ 글로벌 시세·가격을 한눈에 비교해요",
  utilityDisclaimer:
    "데이터 비교 도구예요. 특정 상품을 권유하거나 결과를 약속하지 않아요.",
  transitionDisclosure:
    "시세·가격 비교 도구이며, 가입 후 기회 참여로 이어질 수 있어요.",
  ctaOpenPriceMap: "실시간 시세 맵 열기",
  ctaStartUtility: "시작하기",
  ctaContinueUtility: "시세 맵 계속",
  ctaHint: "👋 시세 맵을 열어 보세요",
  /** media tone variants — utility-only · §38.9 seed */
  variants: {
    meta: "✨ 글로벌 시세 모니터링·비교 툴",
    tt: "✨ 글로벌 시세·가격 비교",
    google: "✨ 실시간 시세·가격 비교 데이터",
  },
} as const;

export type LandingCopy = typeof landing;
