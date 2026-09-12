/**
 * Local breached/common-password fallback — used ONLY when the HIBP Pwned
 * Passwords API (k-anonymity range lookup) is unreachable, per §6.1:
 * "HIBP 장애 시 최소 로컬 blocklist를 사용하고 장애를 기록". This is a
 * deliberately small, illustrative list of well-known long
 * (>=PASSWORD_MIN_LEN=15) breached/trivially-guessable strings — it is a
 * degraded-mode safety net, not a replacement for the real HIBP corpus.
 *
 * Compared case-insensitively against the raw password by
 * pwned-password.service.ts; never logged, never sent anywhere.
 */

export const LOCAL_PASSWORD_BLOCKLIST: ReadonlySet<string> = new Set(
  [
    "password12345678",
    "password123456789",
    "letmein123456789",
    "qwertyuiopasdfghjkl",
    "1234567890123456",
    "12345678901234567890",
    "aaaaaaaaaaaaaaaa",
    "iloveyoumorethanwords",
    "welcometotheteam123",
    "changeme123456789",
    "administrator12345",
    "correcthorsebatterystaple",
    "thequickbrownfoxjumps",
    "abcdefghijklmnopqrst",
    "qwertyuiop1234567890",
  ].map((s) => s.toLowerCase()),
);

export function isOnLocalBlocklist(password: string): boolean {
  if (typeof password !== "string" || !password) return false;
  return LOCAL_PASSWORD_BLOCKLIST.has(password.toLowerCase());
}
