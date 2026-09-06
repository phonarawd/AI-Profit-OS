/**
 * 관리자 연결 코드 교환. 기본 OFF — 정식 로그인이 아니다.
 */

export const ADMIN_CODE_EXCHANGE_FLAG = "AIPO_ADMIN_CODE_EXCHANGE_ENABLED";

export function isAdminCodeExchangeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ADMIN_CODE_EXCHANGE_FLAG] === "true";
}

export type AdminCodeExchangePlan =
  | { ok: true; consume: true }
  | {
      ok: false;
      code:
        | "ADMIN_CODE_EXCHANGE_DISABLED"
        | "ADMIN_AUTH_REQUIRED"
        | "ADMIN_AUTH_INVALID";
    };

export function planAdminCodeExchange(input: {
  enabled: boolean;
  token: string;
  revoked: boolean;
}): AdminCodeExchangePlan {
  if (!input.enabled) {
    return { ok: false, code: "ADMIN_CODE_EXCHANGE_DISABLED" };
  }
  if (!input.token.trim()) {
    return { ok: false, code: "ADMIN_AUTH_REQUIRED" };
  }
  if (input.revoked) {
    return { ok: false, code: "ADMIN_AUTH_INVALID" };
  }
  return { ok: true, consume: true };
}
