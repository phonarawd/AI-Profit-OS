/**
 * T.peotteok — Engine §47.12~15 · UI §6.4e · §27.10 voice.*
 * 퍼뜩 coach surface copy SSOT · 중성 존댓말 · IT 레인명 화면 0
 */

export const peotteok = {
  chatTitle: "퍼뜩에게 묻기",
  laneDisclaimer:
    "플랫폼 숫자는 원장 기준이에요. 일상 답은 참고용이에요.",
  log: "대화",
  factChips: "추천 질문",
  placeholder: "잔액·미션·이용법, 또는 일상 질문을 적어 주세요",
  send: "보내기",
  llmBusy: "지금은 잠시 바빠요. 조금 뒤 다시 물어봐 주세요.",
  sRefuse:
    "출금·지급은 제가 대신 실행할 수 없어요. 출금 화면에서 직접 진행해 주세요.",
  pUnavailable: "\uC9C0\uAE08 \uADF8 \uC22B\uC790\uB294 \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694.",
  sSafeRefuse: "\uADF8\uB7F0 \uC694\uCCAD\uC740 \uB3C4\uC640\uB4DC\uB9B4 \uC218 \uC5C6\uC5B4\uC694.",
  pRefresh: "방금 숫자가 바뀌었을 수 있어요. 최신 잔액·기회를 다시 불러올게요.",
  csDeepLink: "고객센터로 문의하기",
  chipBalance: "출금 가능 수익",
  chipDeposit: "충전하고 시작",
  chipOpportunity: "지금 미션",
  chipBenefits: "받을 혜택",
  chipInvite: "친구 초대",
  chipKyc: "본인 확인",
  chipUsdt: "테더 준비",
  /** §27.10.5 voice SSOT */
  voice: {
    persona: "친근한 도우미 · 이름 퍼뜩 · 성별·인간형 암시 없음",
    greeting: "안녕하세요! 퍼뜩이에요 😊 무엇을 도와드릴까요?",
    shortConfirm: "네, 살펴볼게요 ✨",
    moneyFactTail: "✨",
    refuseS: "출금은 지갑에서 직접 해 주세요 🔐",
    busy: "🤖 퍼뜩이 잠시 바빠요. 조금 뒤 다시 물어봐 주세요",
    helpNudge: "💡 아래 안내를 눌러 보시면 더 쉬워요",
    seniorPace: "한 문장씩 천천히 알려 드릴게요. 이어서 볼까요?",
    youngPace: "짧게 알려 드릴게요 ✨",
    midPace: "설명과 예시를 하나씩 보여 드릴게요 💡",
  },
} as const;

export type PeotteokCopy = typeof peotteok;
