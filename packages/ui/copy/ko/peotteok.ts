/**
 * T.peotteok — Engine §47.12~15 · UI §6.4e
 * 퍼뜩 coach surface copy SSOT
 */

export const peotteok = {
  chatTitle: "퍼뜩에게 묻기",
  laneDisclaimer:
    "플랫폼 숫자는 원장 기준이에요. 일상 답은 참고용이에요.",
  log: "대화",
  factChips: "추천 질문",
  placeholder: "잔액·미션·이용법, 또는 일상 질문을 적어 주세요",
  llmBusy: "지금은 잠시 바빠요. 조금 뒤 다시 물어봐 주세요.",
  sRefuse:
    "출금·지급은 제가 대신 실행할 수 없어요. 출금 화면에서 직접 진행해 주세요.",
  pRefresh: "방금 숫자가 바뀌었을 수 있어요. 최신 잔액·기회를 다시 불러올게요.",
  csDeepLink: "고객센터로 문의하기",
  chipBalance: "출금 가능 수익",
  chipDeposit: "충전하고 시작",
  chipOpportunity: "지금 미션",
  chipBenefits: "받을 혜택",
  chipInvite: "친구 초대",
  chipKyc: "본인 확인",
  chipUsdt: "테더 준비",
} as const;

export type PeotteokCopy = typeof peotteok;
