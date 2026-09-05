/**
 * 온보딩·입금·출금·참여·매칭 중에는 설치/푸시 오버레이를 띄우지 않는다.
 */
export function shouldSuppressPwaChrome(pathname?: string): boolean {
  const p =
    pathname ??
    (typeof window === "undefined" ? "" : window.location.pathname);
  if (p === "/onboarding" || p.startsWith("/onboarding/")) return true;
  if (p.startsWith("/wallet/deposit") || p.startsWith("/wallet/withdraw")) {
    return true;
  }
  if (/\/trades\/[^/]+\/execute(?:\/|$)/.test(p)) return true;
  if (/^\/profits\/[^/]+/.test(p)) return true;
  return false;
}
