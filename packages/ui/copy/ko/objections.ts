/**
 * T.objections.* — UI §38.7 Objection UX (광고유입 4대 반박)
 * JSX 하드코딩 금지 · 제품 구조 답변만
 */
export const objections = {
  sectionTitle: "자주 궁금한 점",
  detailLink: "수익 구조 보기",
  q1: {
    q: "유저 수익을 주면 회사는 뭘로 벌어요?",
    a: "두 시장 가격 차이 중 일부를 운영 마진으로 받아요. 내 지갑 잔액은 회사 수입이 아니에요.",
    oneLiner:
      "회사는 시세 차이 안의 운영 마진으로 벌어요. 회원 지갑 돈을 가져가지 않아요.",
  },
  q2: {
    q: "왜 내가 입금해야 돼요?",
    a: "기회에 참여할 내 자본이에요. 입금은 내 지갑에 보관되고, 거래 후 남은 돈은 출금할 수 있어요.",
    analogy:
      "부동산 앱이 집을 대신 사 주지 않듯, 기회에 넣을 내 자본이 필요해요.",
  },
  q3: {
    q: "회사가 돈을 줘서 시작하면 안 돼요?",
    a: "회사 돈으로 하면 내 부업이 아니에요. 연습은 모의로, 실제 수익·출금은 내 입금으로만 가능해요.",
  },
  q4: {
    q: "부업인데 왜 돈을 넣어요?",
    a: "시간 팔아 시급 받는 알바와 달라요. 시세 차이로 마진을 노리는 자본형 부업이라 소액부터 내 돈이 필요해요.",
  },
  compare: {
    title: "부업 유형 비교",
    wageCol: "시간형 부업",
    capitalCol: "이 앱(자본형)",
    rowWhy: "입금 이유",
    rowSource: "수익 원천",
    rowRisk: "리스크",
    wageWhy: "시간을 팔아 시급을 받아요",
    capitalWhy: "내 자본으로 시세 차익에 참여해요",
    wageSource: "근무 시간",
    capitalSource: "두 시장 가격 차이",
    wageRisk: "시간·체력",
    capitalRisk: "시세 변동 · 원하면 출금 신청",
  },
  depositGate: {
    title: "입금 전에 확인해 주세요",
    body: "입금은 내 지갑 잔액이에요. 알바형 부업이 아니라 자본형 기회 참여예요.",
    ack: "위 내용을 확인했어요",
    continue: "확인 후 입금하기",
  },
  onboardingSlide: "회사는 마진으로 · 나는 내 자본으로",
  detailMini: "예상 수익에는 플랫폼 운영 수수료(마진)가 반영돼요.",
} as const;

export type ObjectionsCopy = typeof objections;
