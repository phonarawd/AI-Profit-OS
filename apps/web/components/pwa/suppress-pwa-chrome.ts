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

export function clientPushHintDisabled(
  env: { NEXT_PUBLIC_PUSH_ENABLED?: string } | undefined,
): boolean {
  return env?.NEXT_PUBLIC_PUSH_ENABLED === "false";
}

/** setVisible 직전·렌더 시점 모두 이 함수를 본다. 서버 비true는 fail-closed. */
export function isPushOverlayAllowed(input: {
  pathname: string;
  serverPushEnabled: boolean | null;
  clientHintDisabled: boolean;
}): boolean {
  if (input.clientHintDisabled) return false;
  if (input.serverPushEnabled !== true) return false;
  if (shouldSuppressPwaChrome(input.pathname)) return false;
  return true;
}

export function isInstallOverlayAllowed(pathname: string): boolean {
  return !shouldSuppressPwaChrome(pathname);
}
