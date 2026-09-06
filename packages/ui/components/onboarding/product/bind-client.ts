import type { OnboardingLesson } from "./lesson-types";

export type ProductOnboardingView = {
  currentStep: number;
  completedAt: string | null;
  preferences: { largeType: boolean; easyExplain: boolean };
  lesson: OnboardingLesson;
};

function asMoney(v: unknown): string | null {
  return typeof v === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(v) ? v : null;
}

function parseLesson(raw: unknown): OnboardingLesson | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.virtualExample !== true) return null;
  const wf = o.waterfall as Record<string, unknown> | undefined;
  const cap = o.capital as Record<string, unknown> | undefined;
  const set = o.settlement as Record<string, unknown> | undefined;
  if (!wf || !cap || !set) return null;
  const success = set.success as Record<string, unknown> | undefined;
  const safeStop = set.safeStop as Record<string, unknown> | undefined;
  if (!success || !safeStop) return null;
  const sell = asMoney(wf.sellExpectedUsdt);
  const buy = asMoney(wf.buyUsdt);
  const fee = asMoney(wf.feeUsdt);
  const shipping = asMoney(wf.shippingUsdt);
  const fx = asMoney(wf.fxCostUsdt);
  const expected = asMoney(wf.expectedProfitUsdt);
  if (!sell || !buy || !fee || !shipping || !fx || !expected) return null;
  return {
    lessonId: String(o.lessonId ?? ""),
    virtualExample: true,
    asOf: String(o.asOf ?? ""),
    markets: Array.isArray(o.markets) ? (o.markets as OnboardingLesson["markets"]) : [],
    matchEvidence: o.matchEvidence as OnboardingLesson["matchEvidence"],
    waterfall: {
      sellExpectedUsdt: sell,
      buyUsdt: buy,
      feeUsdt: fee,
      shippingUsdt: shipping,
      fxCostUsdt: fx,
      expectedProfitUsdt: expected,
    },
    verification: Array.isArray(o.verification)
      ? (o.verification as OnboardingLesson["verification"])
      : [],
    capital: {
      requiredCapitalUsdt: asMoney(cap.requiredCapitalUsdt),
      requiredCapitalKrwApprox:
        typeof cap.requiredCapitalKrwApprox === "string"
          ? cap.requiredCapitalKrwApprox
          : null,
      expectedProfitUsdt: asMoney(cap.expectedProfitUsdt),
      expectedProfitKrwApprox:
        typeof cap.expectedProfitKrwApprox === "string"
          ? cap.expectedProfitKrwApprox
          : null,
      availableUsdt: asMoney(cap.availableUsdt),
      shortfallUsdt: asMoney(cap.shortfallUsdt),
    },
    settlement: {
      success: {
        principalUsdt: asMoney(success.principalUsdt) ?? "",
        settledProfitUsdt: asMoney(success.settledProfitUsdt) ?? "",
      },
      safeStop: {
        principalUsdt: asMoney(safeStop.principalUsdt) ?? "",
        settledProfitUsdt: asMoney(safeStop.settledProfitUsdt) ?? "",
      },
    },
  };
}

function parseView(raw: unknown): ProductOnboardingView | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lesson = parseLesson(o.lesson);
  if (!lesson) return null;
  if (typeof o.currentStep !== "number") return null;
  const prefs = (o.preferences ?? {}) as Record<string, unknown>;
  return {
    currentStep: o.currentStep,
    completedAt: typeof o.completedAt === "string" ? o.completedAt : null,
    preferences: {
      largeType: prefs.largeType === true,
      easyExplain: prefs.easyExplain === true,
    },
    lesson,
  };
}

export async function bindProductOnboarding(hooks: {
  onUnauthorized: () => void;
  onView: (view: ProductOnboardingView) => void;
}): Promise<void> {
  try {
    const res = await fetch("/api/v1/me/product-onboarding", {
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      hooks.onUnauthorized();
      return;
    }
    const view = parseView(await res.json());
    if (view) hooks.onView(view);
  } catch {
    /* cache-only resume */
  }
}

export async function persistProductOnboarding(input: {
  currentStep: number;
  preferences: { largeType: boolean; easyExplain: boolean };
}): Promise<void> {
  try {
    await fetch("/api/v1/me/product-onboarding/progress", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    /* cache remains */
  }
}

export async function finishProductOnboarding(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/me/product-onboarding/complete", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
