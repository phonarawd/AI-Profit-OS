/**
 * User opportunities HTTP surface · Engine §0.9 E-R3
 * Full paths under Nest global prefix api/v1
 * Admin routes live under @Controller("admin") — string sharing FORBIDDEN as SSOT
 */

export const OPPORTUNITY_USER_ROUTES = {
  /** GET — balance-aware feed */
  list: "opportunities",
  /** GET — single OpportunityCard */
  get: "opportunities/:id",
  /** POST — §48.13.1 participate (P0b~P5) */
  participate: "opportunities/:id/participate",
} as const;
