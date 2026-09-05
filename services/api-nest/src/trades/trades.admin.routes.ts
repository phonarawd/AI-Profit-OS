/**
 * Step 7.3 (money-safety) - server-side durable trade termination.
 * Full path under Nest global prefix api/v1.
 */

export const TRADE_ADMIN_ROUTES = {
  /** POST — reconcile trades stuck past their hard deadline with no active poller */
  reconcileTick: "trades/reconcile-tick",
} as const;
