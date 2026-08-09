/**
 * User membership HTTP surface · Engine §0.0.7 / §0.9 E-R7
 * Full paths under Nest global prefix api/v1
 * Admin routes live under @Controller("admin") — string sharing FORBIDDEN as SSOT
 */

export const MEMBERSHIP_USER_ROUTES = {
  /** GET — display ladder · aiPerkFlags · fulfillRate (Rule input 0) */
  get: "me/membership",
} as const;
