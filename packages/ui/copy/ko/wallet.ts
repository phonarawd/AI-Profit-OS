/**
 * T.wallet — Money §41.6 network plain-ko + deposit address labels.
 * Ledger/admin network code mapping Owns=api-nest network-plain-ko · user=트론 only.
 */
export const wallet = {
  /** Fixed §41.6 warning — deposit USDT tab · above address/QR */
  networkWarning:
    "⚠️ 이 주소는 테더(USDT) · 트론 네트워크 로만 보내 주세요.",
  networkWarningLine2:
    "다른 네트워크로 보내면 찾을 수 없을 수 있어요.",
  networkWarningDetail: "자세히",
  networkWarningWrongSent: "잘못 보냈어요",
  /** User-facing network name (ledger code ≠ this) */
  networkName: "트론",
  networkNameFull: "트론 네트워크",
  addressLabel: "내 입금 주소",
  addressCopy: "주소 복사",
  addressCopyDone: "주소를 복사했어요",
  qrLabel: "입금용 QR",
  /** Withdraw confirm — same network name */
  withdrawNetworkHint: "받는 네트워크: 트론",
  /** /me/support wrong-chain · category=deposit */
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
