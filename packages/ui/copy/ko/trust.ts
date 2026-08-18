/** Admin TaxDisclaimerBlock — legal disclaimer only. Not Consumer Visual SSOT. */
export const trust = {
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
} as const;

export type TrustCopy = typeof trust;
