/**
 * T.membership — UI §5.9.2c · §51.18a 등급 여정 카피 SSOT
 * enum·승급·일일캡·aiPerkFlags Owns = Engine §0.0.7
 * Admin 강제/조회 = Admin §9.8.10 (pointer only)
 * FORBIDDEN: 100%보장 · 당첨 · Soft/Hard 등급특권 · 초대티어 배지 혼용 · IT등급명
 */
export const membership = {
  title: "내 등급",
  currentBadge: "지금 등급",
  nextHint: "다음 등급까지",
  nextDeposit: "충전 합계 약 {amount} USDT",
  nextSuccess: "성공 {n}회",
  nextEither: "충전 또는 성공 조건 중 하나",
  nextMax: "최고 등급이에요",
  fulfillRateLabel: "요즘 조건이 맞은 비율",
  fulfillRateHint: "참고용이에요. 당첨률이 아니에요.",
  fulfillRateEmpty: "아직 참고할 기록이 없어요",
  notGuaranteed: "등급이 높아도 매번 맞는 건 아니에요",
  highScarce: "고액·VIP는 기회가 적고, 맞으면 수익이 커요",
  aiUnlockList: "등급에 따라 열리는 AI·기능",
  aiUnlockEmpty: "기본 안내만 열려 있어요",
  ladder: "등급별 혜택",
  ladderExpand: "등급표 펼치기",
  ladderCollapse: "등급표 접기",
  ctaBenefits: "등급별 혜택 보기",
  dailyCapLabel: "하루 기회",
  dailyCapValue: "하루 {n}번",
  bandLabel: "볼 수 있는 자본대",
  labels: {
    sprout: "새싹",
    entry: "입문",
    core: "본격",
    high: "고액",
    vip: "VIP",
  },
  /** Engine aiPerkFlags → 한 줄 (환각 금지 · 플래그만) */
  aiUnlock: {
    basic_feed: "기본 기회 목록",
    safe_stop: "손해 없이 멈추기 안내",
    fact_basic: "퍼뜩 기본 사실 카드",
    near_miss_boost: "아쉬운 기회 조금 더 보여 주기",
    ai_pick_boost: "퍼뜩이 고른 기회 강조",
    membership_band_align: "등급에 맞는 자본대 맞춤",
    high_room: "고액 기회 방",
    slot_priority: "자리 우선 안내",
    stale_precision: "시세 신선도 더 꼼꼼히",
    whale_ultra_priority: "최우선 안내",
    vip_desk_deeplink: "전담 안내 바로가기",
    effective_strictness_lenient: "조건 맞추기 여유",
    daily_cap_min: "하루 횟수 최소화(희소)",
  },
  faq: [
    {
      q: "등급이 높으면 항상 맞나요?",
      a: "아니요. 등급이 높아도 매번 맞는 건 아니에요.",
    },
    {
      q: "고액·VIP는 뭐가 달라요?",
      a: "맞으면 수익이 클 수 있지만, 하루 기회 횟수는 적어요.",
    },
    {
      q: "「요즘 조건이 맞은 비율」은 당첨률인가요?",
      a: "아니요. 참고용 관측이에요. 매칭 규칙에 넣지 않아요.",
    },
  ],
  young: {
    notGuaranteed: "등급↑ ≠ 매번 맞춤 ✨",
    highScarce: "고액·VIP = 기회↓ · 수익↑",
  },
  mid: {
    notGuaranteed: "등급이 높아도 매번 맞는 건 아니에요",
    highScarce: "고액·VIP는 기회가 적고, 맞으면 수익이 커요",
  },
  senior: {
    notGuaranteed: "등급이 높아도 매번 맞는 건 아니에요.",
    highScarce: "고액·VIP는 기회가 적고, 맞으면 수익이 커요.",
  },
  enginePointer: "Engine §0.0.7",
  adminPointer: "Admin §9.8.10",
} as const;

export type MembershipCopy = typeof membership;
