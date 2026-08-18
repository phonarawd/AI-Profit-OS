/** Admin §9.8.10 membership · match-policy-override HTTP · Engine §0.0.7 */

export const MEMBERSHIP_ADMIN_ROUTES = {
  membership: "users/:id/membership",
  matchPolicyOverride: "users/:id/match-policy-override",
  effectivePreview: "users/:id/membership/effective-preview",
} as const;
