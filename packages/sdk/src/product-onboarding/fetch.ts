import { resolveSdkApiBase } from "../internal/qa-loopback-api-base.js";
import type {
  PostAuthProfile,
  ProductOnboardingLesson,
  ProductOnboardingPreferences,
  ProductOnboardingRequestOpts,
  ProductOnboardingView,
} from "./types";

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: ProductOnboardingRequestOpts,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.getAccessToken) {
    const token = await opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const MONEY = /^-?[0-9]+(\.[0-9]+)?$/;

function asMoney(v: unknown): string | null {
  return typeof v === "string" && MONEY.test(v) ? v : null;
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function parseLesson(raw: unknown): ProductOnboardingLesson | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.virtualExample !== true) return null;
  if (typeof o.lessonId !== "string" || !o.lessonId) return null;
  const asOf = asText(o.asOf);
  if (!asOf) return null;
  if (!Array.isArray(o.markets) || o.markets.length < 1) return null;
  const wf = o.waterfall;
  if (wf == null || typeof wf !== "object") return null;
  const w = wf as Record<string, unknown>;
  const capitalRaw = o.capital;
  if (capitalRaw == null || typeof capitalRaw !== "object") return null;
  const c = capitalRaw as Record<string, unknown>;
  const settle = o.settlement;
  if (settle == null || typeof settle !== "object") return null;
  const s = settle as Record<string, unknown>;
  const success = s.success;
  const safeStop = s.safeStop;
  if (success == null || typeof success !== "object") return null;
  if (safeStop == null || typeof safeStop !== "object") return null;
  const ok = success as Record<string, unknown>;
  const stop = safeStop as Record<string, unknown>;
  const sell = asMoney(w.sellExpectedUsdt);
  const buy = asMoney(w.buyUsdt);
  const fee = asMoney(w.feeUsdt);
  const shipping = asMoney(w.shippingUsdt);
  const fx = asMoney(w.fxCostUsdt);
  const expected = asMoney(w.expectedProfitUsdt);
  if (!sell || !buy || !fee || !shipping || !fx || !expected) return null;
  const successProfit = asMoney(ok.settledProfitUsdt);
  const stopProfit = asMoney(stop.settledProfitUsdt);
  const successPrincipal = asMoney(ok.principalUsdt);
  const stopPrincipal = asMoney(stop.principalUsdt);
  if (!successProfit || !stopProfit || !successPrincipal || !stopPrincipal) {
    return null;
  }
  return {
    lessonId: o.lessonId,
    virtualExample: true,
    asOf,
    markets: o.markets as ProductOnboardingLesson["markets"],
    matchEvidence: o.matchEvidence as ProductOnboardingLesson["matchEvidence"],
    waterfall: {
      sellExpectedUsdt: sell,
      buyUsdt: buy,
      feeUsdt: fee,
      shippingUsdt: shipping,
      fxCostUsdt: fx,
      expectedProfitUsdt: expected,
    },
    verification: Array.isArray(o.verification)
      ? (o.verification as ProductOnboardingLesson["verification"])
      : [],
    capital: {
      requiredCapitalUsdt: asMoney(c.requiredCapitalUsdt),
      requiredCapitalKrwApprox:
        typeof c.requiredCapitalKrwApprox === "string"
          ? c.requiredCapitalKrwApprox
          : null,
      expectedProfitUsdt: asMoney(c.expectedProfitUsdt),
      expectedProfitKrwApprox:
        typeof c.expectedProfitKrwApprox === "string"
          ? c.expectedProfitKrwApprox
          : null,
      availableUsdt: asMoney(c.availableUsdt),
      shortfallUsdt: asMoney(c.shortfallUsdt),
    },
    settlement: {
      success: {
        principalUsdt: successPrincipal,
        settledProfitUsdt: successProfit,
      },
      safeStop: {
        principalUsdt: stopPrincipal,
        settledProfitUsdt: stopProfit,
      },
    },
  };
}

export function parseProductOnboardingView(
  raw: unknown,
): ProductOnboardingView | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (typeof o.currentStep !== "number" || o.currentStep < 1 || o.currentStep > 7) {
    return null;
  }
  if (o.state !== "in_progress" && o.state !== "completed") return null;
  if (o.persist !== "ready" && o.persist !== "unavailable") return null;
  const lesson = parseLesson(o.lesson);
  if (!lesson) return null;
  const prefsRaw = o.preferences;
  const prefs =
    prefsRaw && typeof prefsRaw === "object" && !Array.isArray(prefsRaw)
      ? (prefsRaw as Record<string, unknown>)
      : {};
  return {
    version: 1,
    currentStep: o.currentStep,
    state: o.state,
    completedAt: typeof o.completedAt === "string" ? o.completedAt : null,
    preferences: {
      largeType: prefs.largeType === true,
      easyExplain: prefs.easyExplain === true,
    },
    persist: o.persist,
    lesson,
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** 가입 방식과 무관한 다음 경로. 서버 온보딩 상태를 읽는다. 실패 시 미완료로 본다. */
export async function continueAfterAuth(
  stage: PostAuthProfile["onboardingStage"],
  opts: ProductOnboardingRequestOpts = {},
): Promise<string> {
  if (stage !== "B_complete") return "/auth/complete-profile";
  const got = await fetchProductOnboarding(opts);
  const view = got.status === "ok" ? got.view : null;
  return view?.completedAt ? "/" : "/onboarding";
}

export async function fetchProductOnboarding(
  opts: ProductOnboardingRequestOpts = {},
): Promise<
  | { status: "ok"; view: ProductOnboardingView }
  | { status: "unauthorized" }
  | { status: "unavailable" }
> {
  const apiBase = resolveSdkApiBase(opts.apiBase);
  let res: Response;
  try {
    res = await fetch(apiUrl(apiBase, "/api/v1/me/product-onboarding"), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch {
    return { status: "unavailable" };
  }
  if (res.status === 401 || res.status === 403) return { status: "unauthorized" };
  const view = parseProductOnboardingView(await readJson(res));
  if (!res.ok || !view) return { status: "unavailable" };
  return { status: "ok", view };
}

export async function patchProductOnboardingProgress(
  patch: { currentStep?: number; preferences?: ProductOnboardingPreferences },
  opts: ProductOnboardingRequestOpts = {},
): Promise<ProductOnboardingView | null> {
  const apiBase = resolveSdkApiBase(opts.apiBase);
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(
      apiUrl(apiBase, "/api/v1/me/product-onboarding/progress"),
      {
        method: "PATCH",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) return null;
    return parseProductOnboardingView(await readJson(res));
  } catch {
    return null;
  }
}

export async function completeProductOnboarding(
  opts: ProductOnboardingRequestOpts = {},
): Promise<ProductOnboardingView | null> {
  const apiBase = resolveSdkApiBase(opts.apiBase);
  try {
    const res = await fetch(
      apiUrl(apiBase, "/api/v1/me/product-onboarding/complete"),
      {
        method: "POST",
        headers: await authHeaders(opts),
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
      },
    );
    if (!res.ok) return null;
    return parseProductOnboardingView(await readJson(res));
  } catch {
    return null;
  }
}
