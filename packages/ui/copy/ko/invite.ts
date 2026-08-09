/**
 * T.invite — UI §5.9.1a 친구 초대 설명 SSOT (KR 20~70 · toneBand)
 * Amounts / ledger / Pool FIFO Owns = Money §51.5
 * FORBIDDEN: 다단계·피라미드·보장수익·L1/L2/L3 영문·promo pool 영문·N명까지만
 */
export const invite = {
  title: "친구 초대",
  oneLiner:
    "친구를 몇 명이든 부를 수 있어요. 혜택은 친구가 충전·수익을 하면 생겨요.",
  steps3:
    "① 친구가 내 링크로 가입 ② 친구가 첫 충전 ③ 친구가 첫 수익 — 그때마다 진행 표시",
  whenMoney:
    "지금 바로 큰돈이 들어오지 않아요. 친구 충전·수익이 확인된 뒤, 내 수익으로 들어와요.",
  practiceNote:
    "가입 직후 보이는 연습 금액은 꺼낼 수 없어요. 연습용이에요.",
  noCap: "부를 수 있는 친구 수 제한은 없어요.",
  shareLimitNote:
    "하루 공유 보내기 한도는 너무 많은 자동 발송 방지용이에요.",
  holdNote:
    "확인 중이거나 보너스가 잠시 멈춘 때는 부정 이용 방지예요. 초대가 취소된 건 아니에요.",
  poolWaitNote: "「보너스 준비 중」= 지급 대기 · 초대 실패 아님",
  abuseNote:
    "같은 사람이 여러 계정으로 돌리거나 충전 직후 바로 빼면 보너스가 회수될 수 있어요.",
  stats: "초대 현황",
  ctaShare: "친구에게 링크 보내기",
  ctaCode: "코드 복사",
  faq: [
    {
      q: "가입만 하면 돈이 들어오나요?",
      a: "아니요. 친구가 충전해야 혜택이 시작돼요.",
    },
    {
      q: "몇 명까지 초대할 수 있나요?",
      a: "제한 없어요.",
    },
    {
      q: "보너스는 어디서 보나요?",
      a: "지갑 → 수익에 들어와요. 원금이랑 섞지 않아요.",
    },
  ],
  /** Money §51.5 pointer — do not edit formulas here */
  moneyPointer: "Money §51.5",
} as const;

export type InviteCopy = typeof invite;
