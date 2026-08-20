/**
 * Infra §51.9 route table · Nest global prefix = api/v1
 * Controllers mount these relative paths under @Controller('auth')
 */

export const AUTH_ROUTE_PREFIX = "auth" as const;

export const AUTH_ROUTES = {
  signup: "signup",
  profile: "profile",
  session: "session",
  logout: "logout",
  refresh: "refresh",
  oauthStart: "oauth/:provider/start",
  oauthCallback: "oauth/:provider/callback",
  passkeyRegisterOptions: "passkey/register/options",
  passkeyRegisterVerify: "passkey/register/verify",
  passkeyAuthOptions: "passkey/authenticate/options",
  passkeyAuthVerify: "passkey/authenticate/verify",
  magicLinkRequest: "magic-link/request",
  magicLinkVerify: "magic-link/verify",
  deleteAccount: "delete-account",
} as const;

/** Absolute paths after global prefix (for verify:auth-flows) */
export const AUTH_HTTP_PATHS = [
  "POST /api/v1/auth/signup",
  "PATCH /api/v1/auth/profile",
  "GET /api/v1/auth/session",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/refresh",
  "GET /api/v1/auth/oauth/:provider/start",
  "POST /api/v1/auth/oauth/:provider/start",
  "GET /api/v1/auth/oauth/:provider/callback",
  "POST /api/v1/auth/oauth/:provider/callback",
  "POST /api/v1/auth/passkey/register/options",
  "POST /api/v1/auth/passkey/register/verify",
  "POST /api/v1/auth/passkey/authenticate/options",
  "POST /api/v1/auth/passkey/authenticate/verify",
  "POST /api/v1/auth/magic-link/request",
  "POST /api/v1/auth/magic-link/verify",
  "POST /api/v1/auth/delete-account",
] as const;
