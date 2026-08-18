/**
 * User session cookie name — mirrors api-nest USER_SESSION_COOKIE_NAME.
 * httpOnly · 서버 cookies()로만 presence 판정 (클라 document.cookie 불가).
 */
export const USER_SESSION_COOKIE_NAME = "aipo_session" as const;

export function hasUserSessionCookie(
  jar: { get: (name: string) => { value: string } | undefined },
): boolean {
  const v = jar.get(USER_SESSION_COOKIE_NAME)?.value;
  return typeof v === "string" && v.trim().length > 0;
}
