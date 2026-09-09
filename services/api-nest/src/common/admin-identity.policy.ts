/**
 * S3 / B0 Admin 신원 정책. 공용 admin/root 금지 · 실패는 generic.
 */

export const ADMIN_RESERVED_IDENTIFIERS = Object.freeze([
  "admin",
  "root",
  "operator",
  "administrator",
  "superadmin",
  "super",
  "ops",
  "system",
]);

export const ADMIN_PASSWORD_MIN_LEN = 12;
export const ADMIN_LOGIN_MAX_FAILURES = 5;
export const ADMIN_LOCK_MS = 15 * 60 * 1000;
export const ADMIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const ADMIN_ACCESS_TTL_SEC = 15 * 60;
export const ADMIN_REFRESH_TTL_SEC = 12 * 60 * 60;
export const ADMIN_IDLE_TTL_MS = 30 * 60 * 1000;
export const ADMIN_STEP_UP_TTL_MS = 15 * 60 * 1000;

export const ADMIN_GENERIC_AUTH_FAILED = "ADMIN_AUTH_FAILED" as const;

export type AdminSessionKind = "password_mfa" | "code_exchange_emergency";
export type AdminAal = "aal1" | "aal2";

export const STEP_UP_WRITE_CAPABILITIES = Object.freeze([
  "balanceAdjust",
  "withdrawApprove",
  "freezeBan",
  "circuit",
  "rbac",
  "withdrawPinReset",
  "userMembershipForce",
  "loginPasswordReset",
  "userMatchPolicy",
  "userOpportunityOverride",
  "users",
]);

export const MAKER_CHECKER_ACTIONS = Object.freeze([
  "balance_adjust_high",
  "withdraw_approve",
  "withdraw_broadcast",
  "admin_role_change",
  "admin_create",
  "kill_switch",
  "withdraw_limit",
  "signer_binding",
]);

export function canonicalizeAdminIdentifier(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

export function isReservedAdminIdentifier(identifier: string): boolean {
  return ADMIN_RESERVED_IDENTIFIERS.includes(identifier);
}

export function isSharedAdminIdentifierForbidden(identifier: string): boolean {
  const id = canonicalizeAdminIdentifier(identifier);
  return !id || isReservedAdminIdentifier(id);
}

export function adminPasswordMeetsPolicy(password: unknown): boolean {
  return typeof password === "string" && password.length >= ADMIN_PASSWORD_MIN_LEN;
}

export function nextAdminLockUntil(
  failedAttempts: number,
  nowMs = Date.now(),
): Date | null {
  if (failedAttempts < ADMIN_LOGIN_MAX_FAILURES) return null;
  return new Date(nowMs + ADMIN_LOCK_MS);
}

export function isAdminLocked(lockedUntil: Date | string | null, nowMs = Date.now()): boolean {
  if (!lockedUntil) return false;
  const ms = typeof lockedUntil === "string" ? Date.parse(lockedUntil) : lockedUntil.getTime();
  return Number.isFinite(ms) && ms > nowMs;
}

export function sessionKindAllowsWrite(kind: AdminSessionKind): boolean {
  return kind === "password_mfa";
}

export function capabilityNeedsStepUp(
  capability: string,
  level: "read" | "write",
): boolean {
  return level === "write" && STEP_UP_WRITE_CAPABILITIES.includes(capability);
}

export function stepUpIsFresh(stepUpAt: string | null, nowMs = Date.now()): boolean {
  if (!stepUpAt) return false;
  const ms = Date.parse(stepUpAt);
  return Number.isFinite(ms) && nowMs - ms <= ADMIN_STEP_UP_TTL_MS;
}

export function isMakerCheckerAction(actionType: string): boolean {
  return (MAKER_CHECKER_ACTIONS as readonly string[]).includes(actionType);
}

export function planMakerCheckerDecide(input: {
  makerAdminId: string;
  checkerAdminId: string;
  status: string;
}): { ok: true } | { ok: false; code: "ADMIN_SELF_APPROVAL_FORBIDDEN" | "ADMIN_APPROVAL_NOT_PENDING" } {
  if (input.status !== "pending") {
    return { ok: false, code: "ADMIN_APPROVAL_NOT_PENDING" };
  }
  if (
    !input.makerAdminId ||
    !input.checkerAdminId ||
    input.makerAdminId === input.checkerAdminId
  ) {
    return { ok: false, code: "ADMIN_SELF_APPROVAL_FORBIDDEN" };
  }
  return { ok: true };
}
