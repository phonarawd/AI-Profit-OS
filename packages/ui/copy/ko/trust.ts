/**
 * T.trust.* — UI §38 · §38.10 Market Partner Trust · §27.10 guide leads
 * JSX 하드코딩 금지 · sole “시세 참고” trust tone 금지 · 공식 협력 톤
 * disclaimer.* = CI locked · Admin override ❌
 */
export const trust = {
  expectedNotGuaranteed: "예상 수익은 시장 상황에 따라 달라질 수 있어요",
  partners: {
    stripHeadline: "🤝 공식 협력 · 글로벌 시세·데이터 연동",
    stripSub: "대형 쇼핑몰·도소매 시장과 연동해 시세를 가져와요",
    legCaption: "{buyLabel} ↔ {sellLabel}",
    legFootnote: "공식 협력 · 시세·데이터 연동",
    footerCompact: "공식 협력",
    guideHeadline: "🤝 공식 협력사",
    guideSub:
      "시세·데이터를 가져오는 공식 협력사예요. 퍼뜩이 대신 사거나 팔지 않아요.",
    gridSection: "협력사 목록",
    successLegLog: "{buyLabel} ↔ {sellLabel} 시세 반영",
    blurbEbay: "글로벌 중고·수집품 시세를 가져와요",
    blurbAmazon: "아마존 마켓 시세를 가져와요",
    blurbYahooJp: "Yahoo! JAPAN オークション 시세를 가져와요",
    blurbPokemontcg: "포켓몬 카드 목록·참고 시세를 가져와요",
    blurbYgoprodeck: "유희왕 카드 목록·참고 시세를 가져와요",
    blurbCoingecko: "코인 환율을 가져와요",
    blurbFrankfurter: "법정화폐 환율을 가져와요",
  },
  usdt: {
    recommendBadge: "⭐ 추천",
    headline: "🪙 왜 테더(USDT)로 충전하나요?",
    reason1: "해외 시세 정산이 테더(USDT)로 맞춰져 있어요",
    reason2: "입금 확인 후 바로 거래할 수 있어요",
    reason3: "입금→수익→출금이 한 지갑에서 이어져요",
    krwNote: "원화는 익숙하지만 검수 대기가 있어요",
    seniorAnalogy1:
      "해외 쇼핑몰에서 받는 달러 정산처럼, 여기서는 테더(USDT)로 맞춰요.",
    seniorAnalogy2:
      "통장 대신 앱 지갑에 쌓였다가, 필요할 때 꺼내 쓰는 구조예요.",
  },
  compare: {
    colUsdt: "테더(USDT)",
    colKrw: "원화",
    speedLabel: "속도",
    speedUsdt: "자동 확인 · 빠름",
    speedKrw: "검수 · 느림",
    linkLabel: "거래 연결",
    linkUsdt: "입금→거래→출금이 한 지갑",
    linkKrw: "테더로 환산 후 거래",
    recordLabel: "기록",
    recordUsdt: "플랫폼 정산 · 체인 추적",
    recordKrw: "국내 은행 계좌 이체",
    pickLabel: "추천",
    pickUsdt: "대부분 회원 선택",
    pickKrw: "익숙한 분만",
  },
  revenue: {
    headline: "💰 플랫폼은 어떻게 수익을 내나요?",
    body: "시세 차이에서 플랫폼 마진을 받아요. 회원 입금금을 가져가지 않아요.",
    marginLabel: "포함된 운영 수수료",
    opportunityFootnote:
      "예상 수익에는 플랫폼 운영 수수료(마진)가 반영된 금액이에요.",
    qIncome: "플랫폼 수입은?",
    aIncome: "글로벌 시세 차이에서 플랫폼 마진을 받아요.",
    qUser: "회원 수익은?",
    aUser: "차익에서 마진·수수료를 뺀 예상 순수익이에요.",
    qDeposit: "입금금을 가져가나요?",
    aDeposit: "아니요. 입금은 내 지갑에 있고, 플랫폼은 거래마다 마진을 받아요.",
    qMargin: "마진율은?",
    aMargin: "운영 설정값이며, 카드·상세에 포함된 수수료로 보여 드려요.",
  },
  /** CI locked — Admin growth?tab=content override 금지 */
  disclaimer: {
    title: "세금·신고 안내",
    line1:
      "수익 발생 시 세금·신고 의무는 개인 상황마다 달라질 수 있습니다.",
    line2:
      "원화로 입·출금하면 국내 금융 기록과 연결될 수 있습니다.",
    line3:
      "USDT 정산은 플랫폼 글로벌 정산 방식이며, 세금이 없다고 보장하지 않습니다.",
    line4: "궁금하시면 세무 전문가와 상담해 주세요.",
  },
  faq: {
    title: "💡 자주 묻는 질문",
    lead: "쉬운 말로 정리해 두었어요",
  },
} as const;

export type TrustCopy = typeof trust;
