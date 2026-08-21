/**
 * 초보 온보딩 진입 게이트.
 * localStorage는 진행 중 재개만. 완료/우회는 서버 진실만.
 * 잔액 추론 0. pending/failed/cancelled 펀딩 0.
 * 5xx/unknown ≠ 신규 사용자.
 */

export type OnboardingGateDecision = "show" | "bypass" | "unknown";

export type OnboardingExperienceView = {
  beginnerOnboardingCompletedAt: string | null;
  fundingExperienceCompleted: boolean;
};

export function decideOnboardingGate(
  session: OnboardingExperienceView | null,
  status: "ok" | "guest" | "unknown",
): OnboardingGateDecision {
  if (status === "unknown") return "unknown";
  if (status === "guest" || session == null) return "show";
  if (session.beginnerOnboardingCompletedAt) return "bypass";
  if (session.fundingExperienceCompleted === true) return "bypass";
  return "show";
}

export function readExperienceFromSession(raw: unknown): OnboardingExperienceView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const completed =
    typeof o.beginnerOnboardingCompletedAt === "string" &&
    o.beginnerOnboardingCompletedAt.trim()
      ? o.beginnerOnboardingCompletedAt
      : null;
  return {
    beginnerOnboardingCompletedAt: completed,
    fundingExperienceCompleted: o.fundingExperienceCompleted === true,
  };
}
