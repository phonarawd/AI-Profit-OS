/**
 * Admin 세션 로그아웃 무효화. 토큰 원문은 저장하지 않는다.
 * 프로세스 Map 은 캐시. durable 권위는 admin-session.store 다.
 */

import { createHash } from "node:crypto";

const revoked = new Map<string, number>();
const exchanged = new Map<string, number>();

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function revokeAdminAccessToken(token: string, expiresAtMs: number): void {
  revoked.set(hashToken(token), expiresAtMs);
}

export function isAdminAccessTokenRevoked(token: string): boolean {
  const key = hashToken(token);
  const exp = revoked.get(key);
  if (exp == null) return false;
  if (Date.now() >= exp) {
    revoked.delete(key);
    return false;
  }
  return true;
}

export function consumeAdminCodeExchange(token: string, expiresAtMs: number): void {
  exchanged.set(hashToken(token), expiresAtMs);
}

export function isAdminCodeExchangeConsumed(token: string): boolean {
  const key = hashToken(token);
  const exp = exchanged.get(key);
  if (exp == null) return false;
  if (Date.now() >= exp) {
    exchanged.delete(key);
    return false;
  }
  return true;
}

export function resetAdminSessionMapsForTest(): void {
  revoked.clear();
  exchanged.clear();
}
