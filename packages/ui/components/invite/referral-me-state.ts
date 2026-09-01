/**
 * 초대 홈 — 본인 코드는 referralCode만. edges[0].code 파생 금지.
 */

export type ReferralMeView =
  | "loading"
  | "ready"
  | "unauthorized"
  | "unavailable"
  | "disabled";

export type ReferralMeReady = {
  referralCode: string;
  rewardsEnabled: boolean;
  joined: number | undefined;
  myBindingCode: string | null;
};

export type ReferralMeParsed =
  | { view: "ready"; data: ReferralMeReady }
  | { view: "disabled" }
  | null;

export function classifyReferralHttp(
  status: number,
): Exclude<ReferralMeView, "loading" | "ready" | "disabled"> {
  if (status === 401 || status === 403) return "unauthorized";
  return "unavailable";
}

export function parseReferralMe(raw: unknown): ReferralMeParsed {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.enabled === false) return { view: "disabled" };
  if (typeof o.referralCode !== "string") return null;
  const referralCode = o.referralCode.trim();
  if (!referralCode) return null;
  if (o.referralCodeStatus != null && o.referralCodeStatus !== "ready") {
    return null;
  }
  let joined: number | undefined;
  if (Array.isArray(o.edges)) joined = o.edges.length;
  const binding =
    o.myBinding && typeof o.myBinding === "object" && !Array.isArray(o.myBinding)
      ? (o.myBinding as Record<string, unknown>)
      : null;
  const myBindingCode =
    typeof binding?.code === "string" && binding.code.trim()
      ? binding.code.trim()
      : null;
  return {
    view: "ready",
    data: {
      referralCode,
      rewardsEnabled: o.rewardsEnabled === true,
      joined,
      myBindingCode,
    },
  };
}
