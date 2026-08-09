/**
 * User 퍼뜩 coach HTTP — Engine §47.15
 * Auth: JWT audience peotteok-user (guard lands with auth wiring)
 */

export const COACH_USER_ROUTES = {
  /** POST — SSE chat */
  chat: "me/peotteok/chat",
  /** GET — P-lane suggestion chips */
  chips: "me/peotteok/chips",
} as const;
