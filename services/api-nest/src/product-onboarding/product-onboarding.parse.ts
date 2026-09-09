export type OnboardingPreferences = {
  largeType: boolean;
  easyExplain: boolean;
};

export type ProgressPatch =
  | { currentStep: number; preferences?: OnboardingPreferences }
  | { preferences: OnboardingPreferences; currentStep?: number };

export function clampStep(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw)) return null;
  if (raw < 1 || raw > 7) return null;
  return raw;
}

export function parsePreferences(raw: unknown): OnboardingPreferences | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o);
  for (const k of keys) {
    if (k !== "largeType" && k !== "easyExplain") return null;
  }
  if (typeof o.largeType !== "boolean" || typeof o.easyExplain !== "boolean") {
    return null;
  }
  return { largeType: o.largeType, easyExplain: o.easyExplain };
}

export function parsePreferencesLoose(raw: unknown): OnboardingPreferences {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { largeType: false, easyExplain: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    largeType: o.largeType === true,
    easyExplain: o.easyExplain === true,
  };
}

export function parseProgressPatch(body: unknown): ProgressPatch | { error: string } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "PRODUCT_ONBOARDING_MALFORMED" };
  }
  const o = body as Record<string, unknown>;
  const allowed = new Set(["currentStep", "preferences", "event"]);
  for (const k of Object.keys(o)) {
    if (!allowed.has(k)) return { error: "PRODUCT_ONBOARDING_MALFORMED" };
  }
  const hasStep = Object.prototype.hasOwnProperty.call(o, "currentStep");
  const hasPrefs = Object.prototype.hasOwnProperty.call(o, "preferences");
  if (!hasStep && !hasPrefs) return { error: "PRODUCT_ONBOARDING_MALFORMED" };

  const out: { currentStep?: number; preferences?: OnboardingPreferences } = {};
  if (hasStep) {
    const step = clampStep(o.currentStep);
    if (step == null) return { error: "PRODUCT_ONBOARDING_MALFORMED" };
    out.currentStep = step;
  }
  if (hasPrefs) {
    const prefs = parsePreferences(o.preferences);
    if (!prefs) return { error: "PRODUCT_ONBOARDING_MALFORMED" };
    out.preferences = prefs;
  }
  return out as ProgressPatch;
}
