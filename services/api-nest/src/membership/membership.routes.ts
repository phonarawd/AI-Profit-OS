/** Admin §9.8.10 membership · match-policy-override HTTP · Engine §0.0.7 */

export const MEMBERSHIP_ADMIN_ROUTES = {
  userDirectory: "users",
  membership: "users/:id/membership",
  matchPolicyOverride: "users/:id/match-policy-override",
  effectivePreview: "users/:id/membership/effective-preview",
  dailyMatchCap: "users/:id/membership/daily-match-cap",
  gradeDailyCaps: "membership/grade-daily-caps",
  bonusGrants: "users/:id/membership/bonus-grants",
  bonusReclaim: "users/:id/membership/bonus-grants/reclaim",
  quotaProjection: "users/:id/membership/quota-projection",
  presentationProfile: "membership/presentation-profile",
} as const;
