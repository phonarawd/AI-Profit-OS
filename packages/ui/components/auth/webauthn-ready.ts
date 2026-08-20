/**
 * REL-022 — 로그인 WebAuthn 지원 여부 + 선택 햅틱.
 * 미지원/실패는 기존 로그인 방법으로 넘어간다. 빈 화면 금지.
 * Money §43.6 우선순위/OTP 정책 재정의 0.
 */

export function isWebAuthnSupported(
  globalObj: typeof globalThis = globalThis,
): boolean {
  const g = globalObj as typeof globalThis & {
    PublicKeyCredential?: unknown;
    window?: { PublicKeyCredential?: unknown };
  };
  const cred = g.PublicKeyCredential || g.window?.PublicKeyCredential;
  return typeof cred === "function";
}

export function optionalHaptic(
  ms = 12,
  globalObj: typeof globalThis = globalThis,
): boolean {
  try {
    const g = globalObj as typeof globalThis & {
      matchMedia?: (q: string) => { matches: boolean };
      navigator?: { vibrate?: (pattern: number) => boolean };
    };
    if (g.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
    if (typeof g.navigator?.vibrate !== "function") return false;
    g.navigator.vibrate(ms);
    return true;
  } catch {
    return false;
  }
}

export async function tryPasskeyAuthenticate(): Promise<{
  ok: boolean;
  usedFallback: boolean;
}> {
  if (!isWebAuthnSupported()) {
    return { ok: false, usedFallback: true };
  }
  optionalHaptic();
  try {
    const res = await fetch("/api/v1/auth/passkey/authenticate/options", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, usedFallback: true };
    const json = (await res.json()) as {
      rpId?: string;
      origin?: string;
      challenge?: string;
    };
    if (!json.rpId || !json.origin) return { ok: false, usedFallback: true };
    const getCred = (
      globalThis as typeof globalThis & {
        navigator?: {
          credentials?: {
            get?: (opts: unknown) => Promise<unknown>;
          };
        };
      }
    ).navigator?.credentials?.get;
    if (typeof getCred !== "function") {
      return { ok: false, usedFallback: true };
    }
    try {
      const challenge = Uint8Array.from(
        atob((json.challenge || "QQ").replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      await getCred({
        publicKey: {
          challenge,
          rpId: json.rpId,
          timeout: 60_000,
          userVerification: "preferred",
        },
      });
    } catch {
      return { ok: false, usedFallback: true };
    }
    return { ok: true, usedFallback: false };
  } catch {
    return { ok: false, usedFallback: true };
  }
}
