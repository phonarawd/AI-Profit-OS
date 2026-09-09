/**
 * S1F Section 7 session redesign - refresh-token cookie + TTL constants.
 * Kept in a dedicated file (not auth.constants.ts) so this new surface has
 * an isolated, reviewable diff of its own.
 */

/** Opaque refresh token TTL - 30 days, rotated on every /auth/refresh call. */
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

/** httpOnly refresh-token cookie name. Never read by client JavaScript. */
export const USER_REFRESH_COOKIE_NAME = "aipo_refresh" as const;

/** Scoped to the auth path only (never sent to non-auth routes) to
 * minimize exposure - the browser will not attach this cookie to, say,
 * a wallet or trades request even if same-origin. */
export const USER_REFRESH_COOKIE_PATH = "/api/v1/auth" as const;
