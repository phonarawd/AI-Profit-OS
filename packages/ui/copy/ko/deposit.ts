/**
 * T.deposit — Wallet V2 deposit surface.
 * Network plain-ko warning = T.wallet (§41.6).
 */
export const deposit = {
  pageTitle: "입금",
  pageTitleUsdt: "테더(USDT) 입금",
  pageTitleKrw: "원화 입금",
  leadUsdt: "내 입금 주소로 보내면 확인이 끝난 뒤 잔액에 반영해요.",
  leadKrw:
    "입금자 이름과 금액으로 신청을 먼저 받아요. 확인 전에는 잔액이 바뀌지 않아요.",
  tabUsdt: "테더(USDT)",
  tabKrw: "원화",
  addressPrimary: "테더를 받을 주소예요",
  amountTitle: "얼마를 준비할까요?",
  amountHint: "보낼 금액은 직접 정할 수 있어요.",
  amountLabel: "입금 금액",
  usdtSuffix: "USDT",
  quickHint: "빠른 선택",
  suggestChip: "+{n} USDT (이 기회)",
  suggestPrefillHint: "이 기회에 맞는 금액으로 채웠어요. 바꿔도 돼요.",
  krwSuggestNote:
    "참고: 약 {n} USDT에 해당하는 원화를 신청하면 이 기회를 열 수 있어요",
  ctaContinue: "지갑으로 돌아가기",
  optionalHint: "금액은 직접 바꿔도 돼요.",
  afterDepositTitle: "입금이 들어오면",
  afterDepositBody:
    "먼저 확인 중으로 알려 드리고, 확인이 끝나면 잔액에 반영해요.",
  detectingTitle: "입금이 들어온 걸 확인하고 있어요",
  detectingBody: "확인이 끝나면 잔액에 반영해요.",
  krwFormTitle: "입금 신청을 먼저 받아요",
  krwFormHint: "입금 확인에 필요한 정보만 입력해 주세요.",
  depositorLabel: "입금자 이름",
  depositorPlaceholder: "이름 입력",
  amountLabelKrw: "입금할 금액",
  amountPlaceholder: "금액 입력",
  krwUnit: "원",
  krwNoticeTitle: "확인 전에는 잔액이 바뀌지 않아요",
  krwNoticeBody: "신청을 받은 뒤 실제 입금이 확인되면 잔액에 반영해요.",
  ctaSubmit: "입금 신청하기",
  submittedTitle: "신청을 받았어요",
  submittedLead: "신청을 받았어요.",
  submittedBody: "입금이 확인되면 잔액에 반영해요.",
  submittedNotCredited: "아직 잔액에 넣지 않았어요.",
  submittedAmount: "신청 금액",
  submittedCode: "확인 번호",
  backToWallet: "지갑으로 돌아가기",
  guideTitle: "신청 전에 확인해요",
  guide1: "입금자 이름 확인",
  guide2: "입금할 금액 확인",
  guide3: "신청 후 확인 기다리기",
  afterRequestTitle: "신청을 받으면",
  afterRequestBody:
    "신청을 받았다고 알려 드리고, 확인이 끝나기 전에는 잔액이 늘지 않아요.",
  unauthorizedUsdt: "로그인하면 입금 주소를 볼 수 있어요.",
  unauthorizedKrw: "로그인하면 원화 입금을 신청할 수 있어요.",
  deniedUsdt: "지금은 입금 주소를 열 수 없어요.",
  deniedKrw: "지금은 원화 입금을 신청할 수 없어요.",
  unavailableUsdt: "입금 주소를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
  unavailableKrw: "입금 신청을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
  missingValues: "입금 신청에 필요한 값이 부족해요.",
} as const;

export type DepositCopy = typeof deposit;
