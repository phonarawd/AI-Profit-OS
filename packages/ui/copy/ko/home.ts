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
    title: "AI가 찾은 오늘의 글로벌 기회",
    subtitle:
      "퍼뜩 AI가 전 세계 데이터를 살펴보고 참여 가능한 기회를 알려드립니다.",
    cta: "기회 확인하기",
    ctaHref: "#home-opportunity",
    timelineAria: "참여 흐름",
    /** Contract §3.4 유저 대면 4단 */
    timeline: ["AI 스캔", "기회 발견", "참여", "정산 확인"] as const,
    robotSlotAria: "안내 일러스트",
    globeSlotAria: "글로벌 기회",
  },
  money: {
    aria: "내 잔액과 가능 수익",
    principalLabel: "원금",
    todayPossibleLabel: "오늘 가능 수익",
    usdtSuffix: "USDT",
    krwApproxPrefix: "≈",
    krwSuffix: "원",
  },
  opportunity: {
    aria: "참여 가능한 기회",
    sectionTitle: "지금 참여 가능",
    /** Contract §5.1 Empty State Lock */
    emptyStatus: "아직 참여 가능한 기회를 찾는 중이에요",
    emptyNext: "입금 후 AI 분석이 시작됩니다",
    emptyWhy: "시장 데이터에 맞는 기회가 준비되면 바로 보여 드려요",
    emptyCtaDeposit: "입금하기",
    emptyCtaBrowse: "기회 확인",
  },
  rightRail: {
    aria: "진행 현황",
    totalResult: "누적 결과",
    topOpportunities: "관심 기회",
    progressTitle: "현재 진행 현황",
    statusScan: "스캔",
    statusConfirm: "확인",
    statusProgress: "진행",
    statusSettle: "정산",
    topEmpty: "아직 표시할 기회가 없어요",
    totalEmpty: "정산 결과가 쌓이면 여기에 보여요",
  },
  sidebar: {
    inviteCta: "친구 초대",
    navAria: "주요 메뉴",
  },
} as const;

export type HomeCopy = typeof home;
