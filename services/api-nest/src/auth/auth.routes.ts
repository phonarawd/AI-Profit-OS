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
  signupClassic: "signup/classic",
  signupClassicActivate: "signup/classic/verify",
  loginClassic: "login",
  findId: "find-id",
  passwordResetRequest: "password-reset/request",
  passwordResetComplete: "password-reset/complete",
  changePassword: "password/change",
  emailVerifyResend: "email/resend",
  sessionsList: "sessions",
  sessionRevoke: "sessions/:familyId",
  logoutAll: "logout-all",
} as const;

/** Absolute paths after global prefix (for verify:auth-flows) */
export const AUTH_HTTP_PATHS = [
  "POST /api/v1/auth/signup",
  "PATCH /api/v1/auth/profile",
  "GET /api/v1/auth/session",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/oauth/:provider/start",
  "POST /api/v1/auth/oauth/:provider/callback",
  "POST /api/v1/auth/passkey/register/options",
  "POST /api/v1/auth/passkey/register/verify",
  "POST /api/v1/auth/passkey/authenticate/options",
  "POST /api/v1/auth/passkey/authenticate/verify",
  "POST /api/v1/auth/magic-link/request",
  "POST /api/v1/auth/magic-link/verify",
  "POST /api/v1/auth/delete-account",
  "POST /api/v1/auth/signup/classic",
  "POST /api/v1/auth/signup/classic/verify",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/find-id",
  "POST /api/v1/auth/password-reset/request",
  "POST /api/v1/auth/password-reset/complete",
  "POST /api/v1/auth/password/change",
  "POST /api/v1/auth/email/resend",
  "GET /api/v1/auth/sessions",
  "DELETE /api/v1/auth/sessions/:familyId",
  "POST /api/v1/auth/logout-all",
] as const;
