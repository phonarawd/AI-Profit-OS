/**
 * T.wallet — Money §41.6 network plain-ko + deposit address labels.
 * Ledger/admin network code mapping Owns=api-nest network-plain-ko · user=트론 only.
 */
export const wallet = {
  networkWarning: "네트워크를 꼭 확인해 주세요",
  networkWarningLine2: "테더(USDT)는 트론 네트워크로만 보내 주세요.",
  networkWarningLine3: "다른 네트워크로 보내면 찾기 어려울 수 있어요.",
  networkWarningDetail: "자세히",
  networkWarningWrongSent: "잘못 보냈어요?",
  networkName: "트론",
  networkNameFull: "트론 네트워크",
  addressLabel: "내 입금 주소",
  addressCopy: "주소 복사",
  addressCopyDone: "주소를 복사했어요",
  qrLabel: "입금용 QR",
  withdrawNetworkHint: "받는 네트워크: 트론",
  supportWrongChainTitle: "잘못 보낸 입금",
  supportWrongChainHint:
    "보낸 기록(거래 번호)을 남겨 주시면 확인 후 안내해 드릴게요.",
  supportTxHashLabel: "보낸 기록 번호",
  supportSubmit: "문의 보내기",
  supportSubmitted: "📝 문의를 접수했어요. 확인 후 안내드릴게요",
  guideGetUsdtTitle: "테더 준비·보내기",
  guideNetworkCheck:
    "거래소·지갑 앱에서 테더(USDT)를 준비한 뒤, 아래 네트워크 이름과 같은지 확인해요.",
  guideCtaKrw: "원화로 충전",
  guideCtaUsdt: "테더로 충전",
} as const;

export type WalletCopy = typeof wallet;
