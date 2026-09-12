/**
 * GET /api/v1/me/trial-state — 유저웹이 이미 부르는 경로.
 * Nest global prefix = api/v1
 */
export const TRIAL_STATE_USER_ROUTES = {
  get: "me/trial-state",
} as const;
