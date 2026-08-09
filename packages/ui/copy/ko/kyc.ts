/**
 * T.kyc.* — Money §42.4 · Canon kyc-guide / kyc-doc-capture / kyc-confirm
 * Toast emoji 1~2 · 주민번호 타이핑 카피 0
 */
export const kyc = {
  withdrawRequired:
    "🔐 출금하려면 본인 확인이 필요해요! 1번만 하면 돼요 😊",
  pending: "⏳ 본인 확인을 검토 중이에요. 잠시만 기다려 주세요 🙏",
  approved: "✅ 본인 확인 완료! 이제 출금할 수 있어요 🎉",
  rejected: "😔 확인이 어려워요. 다시 신청해 주세요",
  pageTitle: "🪪 본인 확인",
  pageSubtitle: "출금할 때 한 번만 하면 돼요",
  whyOnce: "출금 안전을 위해 한 번만 확인해요",
  storagePlain: "서류는 안전하게 보관되며 외부에 공개되지 않아요",
  steps123: "1 안내 → 2 서류 → 3 확인",
  start: "시작하기",
  nextConfirm: "다음",
  docType: "신분증 종류",
  captureHint: "프레임 안에 맞춰 찍어 주세요",
  preview: "미리보기",
  retake: "다시 찍기",
  legalName: "이름",
  phone: "휴대폰 번호",
  birthDate: "생년월일",
  selfieOptional: "셀피 (선택)",
  submit: "제출하기",
  securityFooter: "서류는 안전하게 보관되며 외부에 공개되지 않아요",
  pendingInline: "검토 중이에요",
} as const;

export type KycCopy = typeof kyc;
