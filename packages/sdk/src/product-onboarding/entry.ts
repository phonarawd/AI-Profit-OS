import type {
  EntryDecision,
  PostAuthProfile,
  ProductOnboardingView,
} from "./types";

export function clampOnboardingStep(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isInteger(raw)) return 1;
  if (raw < 1) return 1;
  if (raw > 7) return 7;
  return raw;
}

/**
 * 가입 방식과 무관한 서버 결정. 프로필 미완료 → 프로필.
 * 제품 온보딩 미완료/미확인 → /onboarding. 완료만 /.
 */
export function decidePostAuthEntry(
  profile: PostAuthProfile,
  onboarding: Pick<ProductOnboardingView, "completedAt" | "currentStep"> | null,
): EntryDecision {
  if (profile.onboardingStage !== "B_complete") {
    return { destination: "/auth/complete-profile" };
  }
  if (!onboarding?.completedAt) {
    return {
      destination: "/onboarding",
      currentStep: clampOnboardingStep(onboarding?.currentStep ?? 1),
    };
  }
  return { destination: "/" };
}
