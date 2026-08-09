/**
 * T.user.* — empty / hint / 5탭 · §27.10
 * IA labels must match verify:ia-tabs
 */
export const user = {
  tabs: {
    home: "홈",
    profits: "수익",
    trades: "내거래",
    wallet: "지갑",
    me: "내정보",
  },
  me: {
    title: "내정보",
    settings: "설정",
    legal: "약관과 정보",
    kyc: "본인 확인",
    peotteok: "퍼뜩",
    membership: "멤버십",
    inbox: "쪽지함",
    invite: "친구 초대",
    events: "이벤트",
    strategies: "내 전략",
    support: "고객센터",
    benefits: "혜택",
    guidePartners: "시세 파트너",
  },
  profits: {
    title: "수익",
    subtitle: "지금 참여할 수 있는 수익 기회를 모아 보여 드려요",
  },
  trades: {
    title: "내거래",
    subtitle: "오늘·이번 달 정산된 수익을 확인할 수 있어요",
    todayLabel: "오늘 수익",
    monthLabel: "이번 달 수익",
  },
  walletHistory: {
    title: "입출금 내역",
  },
  empty: {
    opportunities: "✨ 아직 보여줄 수익 기회가 없어요",
    opportunitiesCta: "충전하기",
    trades: "📝 아직 진행한 기회가 없어요",
    tradesCta: "기회 보러 가기",
    walletHistory: "💰 아직 입출금 내역이 없어요",
    inbox: "📢 아직 받은 쪽지가 없어요",
    benefits: "🎁 지금 받을 혜택이 없어요",
  },
  hint: {
    depositAmount: "💡 충전할 금액을 입력해 주세요",
    withdrawAddress: "🔐 출금 주소를 정확히 확인해 주세요",
    searchOpportunity: "✨ 원하는 기회를 찾아 보세요",
  },
  placeholder: {
    chat: "잔액·미션·이용법, 또는 일상 질문을 적어 주세요",
    inviteCode: "초대 코드를 입력해 주세요",
  },
} as const;

export type UserCopy = typeof user;
