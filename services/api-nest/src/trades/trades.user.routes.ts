/**
 * User trades HTTP surface · Engine §0.9 E-R5 · §48.13 execute loop
 * Full paths under Nest global prefix api/v1
 * Phase0 = polling execute-tick · Phase1+ SSE replaces response channel only
 */

export const TRADE_USER_ROUTES = {
  /** GET — session user trade_executions (기존 GET :id 투영 · 목록) */
  list: "trades",
  /** GET — trade execution state */
  get: "trades/:id",
  /** POST — Phase0 in-process Rule tick (Soft60/Hard90) */
  executeTick: "trades/:id/execute-tick",
} as const;
