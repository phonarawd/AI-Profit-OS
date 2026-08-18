/**
 * User benefits HTTP surface · Money §51.8a.7 / money-user-benefits-read
 * Full paths under Nest global prefix api/v1
 * POST sync · SSE = out of gate (read GET only)
 */

export const BENEFITS_USER_ROUTES = {
  /** GET — mission cards + user accrual overlay */
  list: "me/benefits",
  /** GET — claimable / pending_hold counts · rewardsEnabled */
  summary: "me/benefits/summary",
} as const;
