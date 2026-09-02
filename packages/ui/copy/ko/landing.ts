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
  ctaJoin: "가입하고 시작하기",
  ctaLogin: "로그인",
  guestChromeKicker: "GLOBAL PRICE COMPARISON",
  guestChromeHeadlineA: "AI가 여러 시장의 시세를 비교해",
  guestChromeHeadlineB: "한눈에 보여드려요.",
  guestChromeBody:
    "같은 상품을 연결하고, 여러 시장의 가격과 필요한 조건을 이해하기 쉽게 정리합니다.",
  guestTag: "글로벌 시세 비교",
  guestHeadlineLines: [
    "AI가 전 세계 시세를 비교해요",
    "같은 상품과 조건을 이어 보여 드려요",
  ],
  guestLead:
    "직접 찾아다니지 않아도 돼요. 여러 시장의 가격을 비교하고 같은 상품을 연결해 보여 드려요.",
  guestDisclaimer: "표시되는 가격과 조건은 시장 상황에 따라 달라질 수 있어요.",
  guestPoints: [
    { title: "글로벌 시세·가격 비교", body: "여러 나라와 시장의 가격을 한곳에서 비교해요." },
    { title: "AI 동일상품 매칭", body: "여러 시장에서 같은 상품인지 연결해 보여 드려요." },
    { title: "조건과 기회 안내", body: "이용에 필요한 조건과 확인할 수 있는 기회를 분명히 보여 드려요." },
  ],
  guestUnavailableTitle: "지금은 화면을 불러오지 못했어요",
  guestUnavailableBody: "잠시 후 다시 시도해 주세요.",
  guestRetry: "다시 시도",
  guestUnderstandA: "여러 곳의 시세·가격을 나란히 비교해요",
  guestUnderstandB: "같은 상품을 이어서 보여 드려요",
  guestUnderstandC: "이용에 필요한 조건을 분명히 알려 드려요",
  ctaHint: "👋 시세 맵을 열어 보세요",
  /** LandingOperatorFooter · /me/legal 1링크 (§6.4c.1 D) */
  legalLink: "약관과 정보",
  detLicensePrefix: "DET 면허",
  /** media tone variants — utility-only · §38.9 seed */
  variants: {
    meta: "✨ 글로벌 시세 모니터링·비교 툴",
    tt: "✨ 글로벌 시세·가격 비교",
    google: "✨ 실시간 시세·가격 비교 데이터",
  },
} as const;

export type LandingCopy = typeof landing;
