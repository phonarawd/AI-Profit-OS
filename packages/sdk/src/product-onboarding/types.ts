export const PRODUCT_ONBOARDING_VERSION = 1;

export type ProductOnboardingState = "in_progress" | "completed";

export type ProductOnboardingPreferences = {
  largeType: boolean;
  easyExplain: boolean;
};

export type ProductOnboardingLesson = {
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

export type ProductOnboardingView = {
  version: number;
  currentStep: number;
  state: ProductOnboardingState;
  completedAt: string | null;
  preferences: ProductOnboardingPreferences;
  persist: "ready" | "unavailable";
  lesson: ProductOnboardingLesson;
};

export type PostAuthProfile = {
  onboardingStage: "A" | "B_incomplete" | "B_complete";
};

export type EntryDecision =
  | { destination: "/auth/complete-profile" }
  | { destination: "/onboarding"; currentStep: number }
  | { destination: "/" };

export type ProductOnboardingRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  signal?: AbortSignal;
};
