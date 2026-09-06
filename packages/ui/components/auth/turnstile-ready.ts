/** 공개 사이트키만. 비밀키는 서버 TURNSTILE_SECRET_KEY. */
export function turnstileSiteKey(): string {
  if (typeof process === "undefined") return "";
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return typeof key === "string" ? key.trim() : "";
}

export function isTurnstileReady(): boolean {
  return turnstileSiteKey().length > 0;
}
