/** Nest EDUCATIONAL_LESSON_V1과 같은 문자열. 재계산 없음. */
export const FALLBACK_LESSON: OnboardingLesson = {
  lessonId: "product-onboarding-v1",
  virtualExample: true,
  asOf: "2026-09-06T14:20:00.000Z",
  markets: [
    { id: "m1", name: "A", currency: "USD", checkedAt: "2026-09-06T14:18:00.000Z" },
    { id: "m2", name: "B", currency: "KRW", checkedAt: "2026-09-06T14:19:00.000Z" },
    { id: "m3", name: "C", currency: "USD", checkedAt: "2026-09-06T14:20:00.000Z" },
  ],
  matchEvidence: {
    modelName: "pass",
    condition: "pass",
    identifier: "pass",
    saleTerms: "pass",
    status: "matched",
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
    { id: "freshness", status: "pass" },
    { id: "identity", status: "pass" },
    { id: "costComplete", status: "pass" },
    { id: "policy", status: "pass" },
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
    success: { principalUsdt: "1000.00", settledProfitUsdt: "271.00" },
    safeStop: { principalUsdt: "1000.00", settledProfitUsdt: "0.00" },
  },
};

export type OnboardingLesson = {
  lessonId: string;
  virtualExample: true;
  asOf: string;
  markets: ReadonlyArray<{
    id: string;
    name: string;
    currency: string;
    checkedAt: string;
  }>;
  matchEvidence: {
    modelName: "pass" | "hold";
    condition: "pass" | "hold";
    identifier: "pass" | "hold";
    saleTerms: "pass" | "hold";
    status: "matched" | "hold";
  };
  waterfall: {
    sellExpectedUsdt: string;
    buyUsdt: string;
    feeUsdt: string;
    shippingUsdt: string;
    fxCostUsdt: string;
    expectedProfitUsdt: string;
  };
  verification: ReadonlyArray<{
    id: "freshness" | "identity" | "costComplete" | "policy";
    status: "pass" | "hold";
  }>;
  capital: {
    requiredCapitalUsdt: string | null;
    requiredCapitalKrwApprox: string | null;
    expectedProfitUsdt: string | null;
    expectedProfitKrwApprox: string | null;
    availableUsdt: string | null;
    shortfallUsdt: string | null;
  };
  settlement: {
    success: { principalUsdt: string; settledProfitUsdt: string };
    safeStop: { principalUsdt: string; settledProfitUsdt: string };
  };
};
