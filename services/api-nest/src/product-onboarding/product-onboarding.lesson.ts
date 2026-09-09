/**
 * 교육용 예시 — 서버 문자열 SSOT. 클라이언트 재계산 금지.
 * 가상 예시 · 실제 거래 아님. visual fixture 승격 금지.
 *
 * 1484.00 - 1000.00 - 80.00 - 80.00 - 40.00 = 284.00
 * 정산 완료 수익(271.00)은 예상 수익과 다르게 두어 라벨을 가르친다.
 */

export const PRODUCT_ONBOARDING_VERSION = 1;

export const EDUCATIONAL_LESSON_V1 = {
  lessonId: "product-onboarding-v1",
  virtualExample: true as const,
  asOf: "2026-09-06T14:20:00.000Z",
  markets: [
    {
      id: "m1",
      name: "시장 A",
      currency: "USD",
      checkedAt: "2026-09-06T14:18:00.000Z",
    },
    {
      id: "m2",
      name: "시장 B",
      currency: "KRW",
      checkedAt: "2026-09-06T14:19:00.000Z",
    },
    {
      id: "m3",
      name: "시장 C",
      currency: "USD",
      checkedAt: "2026-09-06T14:20:00.000Z",
    },
  ],
  matchEvidence: {
    modelName: "pass" as const,
    condition: "pass" as const,
    identifier: "pass" as const,
    saleTerms: "pass" as const,
    status: "matched" as const,
  },
  waterfall: {
    sellExpectedUsdt: "1484.00",
    buyUsdt: "1000.00",
    feeUsdt: "80.00",
    shippingUsdt: "80.00",
    fxCostUsdt: "40.00",
    expectedProfitUsdt: "284.00",
  },
  verification: [
    { id: "freshness", status: "pass" as const },
    { id: "identity", status: "pass" as const },
    { id: "costComplete", status: "pass" as const },
    { id: "policy", status: "pass" as const },
  ],
  capital: {
    requiredCapitalUsdt: "1000.00",
    requiredCapitalKrwApprox: "1360000",
    expectedProfitUsdt: "284.00",
    expectedProfitKrwApprox: "386240",
    availableUsdt: null,
    shortfallUsdt: null,
  },
  settlement: {
    success: {
      principalUsdt: "1000.00",
      settledProfitUsdt: "271.00",
    },
    safeStop: {
      principalUsdt: "1000.00",
      settledProfitUsdt: "0.00",
    },
  },
} as const;

export type EducationalLessonV1 = typeof EDUCATIONAL_LESSON_V1;
