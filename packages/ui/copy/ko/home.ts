/**
 * T.home.* — Peotteok Home Experience (ADR-017 · Contract v1.2)
 * Hero / Header / RightRail copy SSOT · JSX 하드코딩 금지
 */
export const home = {
  header: {
    aria: "앱 상태",
    scanIdle: "AI가 기회를 살펴보는 중",
    scanEmpty: "오늘 요약 준비 중",
    scanSettled: "오늘 정산 {n}건",
    notificationAria: "쪽지함",
    avatarAria: "내정보",
    tierAria: "멤버십",
  },
  hero: {
    /** Visual Contract §3.2 · Implementation §07.2 — 목업 제목/「오늘 벌 수 있는 기회」단독 금지 */
    title: "AI가 찾은 오늘의 글로벌 기회",
    subtitle:
      "퍼뜩 AI가 전 세계 데이터를 살펴보고 참여 가능한 기회를 알려드립니다.",
    /** §3.7 CTA Lock · 보기/탐색 primary · 수익 벌기 금지 */
    cta: "기회 확인하기",
    ctaHref: "#home-opportunity",
    timelineAria: "참여 흐름",
    /**
     * Visual §3.4 유저 대면 4단 · STEP5 Slice2 Founder lock
     * Reference 5단/금지 용어 복제 0 · Product copy 변경 아님
     */
    timeline: ["AI 스캔", "기회 발견", "참여", "정산 확인"] as const,
    robotSlotAria: "퍼뜩 AI 안내 일러스트",
    globeSlotAria: "글로벌 기회 상징",
  },
  money: {
    aria: "내 잔액과 가능 수익",
    /** C02 · Home Fact = principalUsdt only · 사용가능/참여중 분할 라벨 금지 */
    principalLabel: "내 잔액",
    todayPossibleLabel: "오늘 가능 수익",
    usdtSuffix: "USDT",
    krwApproxPrefix: "≈",
    loading: "불러오는 중",
    unavailable: "아직 확인할 수 없어요",
    guestHint: "로그인하면 보여요",
    krwSuffix: "원",
  },
  opportunity: {
    aria: "참여 가능한 기회",
    sectionTitle: "지금 참여 가능",
    /** Contract §5.1 Empty State Lock */
    emptyStatus: "아직 참여 가능한 기회를 찾는 중이에요",
    emptyNext: "입금 후 AI 분석이 시작됩니다",
    emptyWhy: "시장 데이터에 맞는 기회가 준비되면 바로 보여 드려요",
    /** Empty primary 단일 CTA · 경쟁 browse 자기참조 링크 폐기 */
    emptyCtaDeposit: "입금하고 기회 열기",
    guestStatus: "로그인하면 참여 가능한 기회를 볼 수 있어요",
    loadingStatus: "기회를 불러오는 중이에요",
    errorStatus: "기회를 불러오지 못했어요",
    emptyCtaBrowse: "다른 기회 확인하기",
  },
  rightRail: {
    aria: "진행 현황",
    /** C01 · ledgerTotal/settle = COUNT · 누적 USDT 수익 슬롯 아님 */
    totalResult: "오늘 정산",
    topOpportunities: "관심 기회",
    progressTitle: "현재 진행 현황",
    statusScan: "스캔",
    statusConfirm: "확인",
    statusProgress: "진행",
    statusSettle: "정산",
    topEmpty: "아직 표시할 기회가 없어요",
    countAbsent: "아직 없음",
    totalEmpty: "오늘 정산이 끝나면 여기에 건수로 보여요",
  },
  sidebar: {
    inviteCta: "친구 초대",
    navAria: "주요 메뉴",
  },
  /** 홈 세션 배너 · toast SESSION_EXPIRED와 분리(게스트≠만료) */
  session: {
    guestTitle: "로그인해 이어서 보기",
    guestBody: "로그인하면 참여 가능한 기회와 오늘 요약을 볼 수 있어요",
    guestCta: "로그인",
    expiredTitle: "🔐 다시 로그인해 주세요",
    expiredBody: "안전한 이용을 위해 다시 로그인해 주세요",
    expiredCta: "로그인",
  },
} as const;

export type HomeCopy = typeof home;
