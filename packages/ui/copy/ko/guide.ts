/**
 * T.guide.* — /me/guide/* · §27.10.2 title emoji 1 · body ≤2/card
 * partners lead also in T.trust.partners
 */
export const guide = {
  usdt: {
    title: "🪙 테더(USDT)란?",
    lead: "해외 시세 정산에 맞춘 디지털 달러예요",
    why: "💡 왜 쓰나요?",
    whyBody: "입금→수익→출금이 한 지갑에서 이어져요",
  },
  getUsdt: {
    title: "📱 테더 준비·보내기",
    lead: "원화로 충전하거나, 테더를 준비한 뒤 퍼뜩 주소로 보내요",
    chooseFirst: "먼저 선택해 주세요",
    whatIsUsdt: "테더(USDT)란?",
    whatIsUsdtBody: "해외 시세 정산에 맞춘 디지털 달러예요",
    whyLink: "왜 테더로 충전하나요?",
    prepareTitle: "준비",
    prepareBody:
      "거래소·지갑 앱에서 테더(USDT)를 준비한 뒤, 아래 네트워크 이름과 같은지 확인해요.",
    sendTitle: "보내기 주의",
    wrongChain: "잘못 보냈어요",
    wrongChainBody: "잘못된 네트워크로 보냈다면 고객센터로 문의해 주세요",
    supportLink: "고객센터로 문의",
    step1: "① 믿을 수 있는 곳에서 테더(USDT)를 준비해요",
    step2: "② 퍼뜩이 알려 준 주소로 보내요",
    step3: "③ 확인되면 잔액에 반영돼요",
  },
  revenue: {
    title: "💰 플랫폼 수익은?",
    lead: "시세 차이에서 운영 수수료를 받아요",
  },
  faq: {
    title: "💡 자주 묻는 질문",
    lead: "쉬운 말로 정리해 두었어요",
  },
  principal: {
    title: "🔐 원금과 수익",
    lead: "근무 중 원금과 출금 가능 수익을 나눠 보여 드려요",
  },
  partners: {
    title: "🤝 공식 협력사",
    lead: "시세·데이터를 가져오는 공식 협력사예요",
  },
  /** §51.20 Weekly Market Briefing · 투자권유 금지 */
  marketWeekly: {
    title: "📊 이번 주 시세 차이 안내",
    lead: "교육용으로 이번 주 시세 차이 분포를 요약해요",
    eduPurpose:
      "왜 시세 차이가 생겼는지 이해하는 안내예요. 지금 사거나 팔라는 말이 아니에요.",
    empty: "이번 주 요약이 아직 없어요. 다음에 다시 확인해 주세요.",
    p10Label: "낮은 쪽(10%)",
    p50Label: "가운데(50%)",
    p90Label: "높은 쪽(90%)",
    colBand: "구간",
    colValue: "시세 차이",
    bulletP50: "가운데 값은 {v} 근처였어요",
    bulletRange: "대체로 {lo}~{hi} 사이에 있었어요",
    bulletWhy: "시장마다 호가가 달라서 차이가 생겨요",
    disclaimer:
      "교육용 요약이에요. 매수·매도 지시가 아니며, 수익을 약속하지 않아요.",
  },
} as const;

export type GuideCopy = typeof guide;
