/**
 * S3 / B0 Admin 정상 로그인 · MFA · durable session · step-up.
 * 연결 코드 교환과 경로를 섞지 않는다.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "../auth/password-hash";
import {
  ADMIN_ACCESS_TTL_SEC,
  ADMIN_CHALLENGE_TTL_MS,
  ADMIN_GENERIC_AUTH_FAILED,
  canonicalizeAdminIdentifier,
  isAdminLocked,
  isSharedAdminIdentifierForbidden,
  nextAdminLockUntil,
  planMakerCheckerDecide,
  stepUpIsFresh,
} from "./admin-identity.policy";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyTotp,
} from "./admin-totp";
import { signAdminAccessToken } from "./admin-token";
import {
  getAdminIdentityStore,
  newSessionIds,
  sessionExpiryIso,
  type AdminIdentityStore,
  type AdminSessionRecord,
} from "./admin-session.store";

let dummyHashPromise: Promise<string> | null = null;

function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("admin-identity-dummy-password-xx");
  return dummyHashPromise;
}

export function hashOpaque(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requireStore(): AdminIdentityStore {
  const store = getAdminIdentityStore();
  if (!store) {
    throw new Error("ADMIN_IDENTITY_STORE_UNWIRED");
  }
  return store;
}

export async function startAdminPasswordLogin(input: {
  identifier: unknown;
  password: unknown;
}): Promise<
  | { ok: true; next: "mfa"; challengeId: string }
  | { ok: false; code: typeof ADMIN_GENERIC_AUTH_FAILED }
> {
  const store = getAdminIdentityStore();
  if (!store) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };

  const identifier = canonicalizeAdminIdentifier(input.identifier);
  const password = typeof input.password === "string" ? input.password : "";
  if (!identifier || !password || isSharedAdminIdentifierForbidden(identifier)) {
    await verifyPassword(password || "x", await dummyPasswordHash());
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }

  const cred = await store.findCredentialByIdentifier(identifier);
  if (!cred || !cred.active) {
    await verifyPassword(password, cred?.passwordHash ?? (await dummyPasswordHash()));
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }
  if (isAdminLocked(cred.lockedUntil)) {
    await verifyPassword(password, cred.passwordHash);
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }

  const matched = await verifyPassword(password, cred.passwordHash);
  if (!matched) {
    const failed = cred.failedAttempts + 1;
    const locked = nextAdminLockUntil(failed);
    await store.updateCredentialLock({
      adminId: cred.adminId,
      failedAttempts: failed,
      lockedUntil: locked ? locked.toISOString() : null,
    });
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }

  const totpCipher = await store.getTotp(cred.adminId);
  if (!totpCipher) {
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }

  await store.updateCredentialLock({
    adminId: cred.adminId,
    failedAttempts: 0,
    lockedUntil: null,
  });

  const challengeId = randomBytes(24).toString("base64url");
  await store.putChallenge({
    id: randomUUID(),
    adminId: cred.adminId,
    purpose: "login_mfa",
    tokenHash: hashOpaque(challengeId),
    expiresAt: new Date(Date.now() + ADMIN_CHALLENGE_TTL_MS).toISOString(),
  });
  return { ok: true, next: "mfa", challengeId };
}

export async function finishAdminMfaLogin(input: {
  challengeId: unknown;
  totp?: unknown;
  backupCode?: unknown;
  userAgentClass?: string;
  ipClass?: string;
}): Promise<
  | {
      ok: true;
      adminId: string;
      role: string;
      accessToken: string;
      refreshToken: string;
      session: AdminSessionRecord;
    }
  | { ok: false; code: typeof ADMIN_GENERIC_AUTH_FAILED }
> {
  const store = getAdminIdentityStore();
  if (!store) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const challengeId = String(input.challengeId ?? "").trim();
  if (!challengeId) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };

  const tokenHash = hashOpaque(challengeId);
  const pending = await store.peekChallenge(tokenHash, "login_mfa");
  if (!pending) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };

  const row = await store.findCredentialByAdminId(pending.adminId);
  if (!row || !row.active) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  if (isAdminLocked(row.lockedUntil)) {
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }

  const cipher = await store.getTotp(row.adminId);
  if (!cipher) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };

  const totpOk = input.totp
    ? verifyTotp(decryptTotpSecret(cipher), input.totp)
    : false;
  const backup = String(input.backupCode ?? "").trim();
  const backupOk = backup
    ? await store.consumeBackupCode(row.adminId, hashBackupCode(backup))
    : false;
  if (!totpOk && !backupOk) {
    const failed = row.failedAttempts + 1;
    const locked = nextAdminLockUntil(failed);
    await store.updateCredentialLock({
      adminId: row.adminId,
      failedAttempts: failed,
      lockedUntil: locked ? locked.toISOString() : null,
    });
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }

  const consumed = await store.consumeChallenge(tokenHash, "login_mfa");
  if (!consumed) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };

  await store.updateCredentialLock({
    adminId: row.adminId,
    failedAttempts: 0,
    lockedUntil: null,
  });

  const minted = await mintPasswordMfaSession(store, {
    adminId: row.adminId,
    role: row.role,
    userAgentClass: input.userAgentClass,
    ipClass: input.ipClass,
    stepUp: true,
  });
  return { ok: true, ...minted };
}

export async function mintPasswordMfaSession(
  store: AdminIdentityStore,
  input: {
    adminId: string;
    role: string;
    userAgentClass?: string;
    ipClass?: string;
    stepUp?: boolean;
  },
): Promise<{
  adminId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  session: AdminSessionRecord;
}> {
  const ids = newSessionIds();
  const times = sessionExpiryIso();
  const refreshToken = randomBytes(32).toString("base64url");
  const nowIso = times.issuedAt;
  const session: AdminSessionRecord = {
    id: ids.id,
    adminId: input.adminId,
    familyId: ids.familyId,
    accessJti: ids.accessJti,
    refreshHash: hashOpaque(refreshToken),
    kind: "password_mfa",
    aal: "aal2",
    issuedAt: times.issuedAt,
    expiresAt: times.expiresAt,
    lastSeenAt: times.issuedAt,
    idleDeadline: times.idleDeadline,
    stepUpAt: input.stepUp ? nowIso : null,
    revokedAt: null,
    rotatedAt: null,
  };
  await store.insertSession(session);
  const accessToken = signAdminAccessToken({
    adminId: input.adminId,
    role: input.role,
    jti: ids.accessJti,
    expiresInSec: ADMIN_ACCESS_TTL_SEC,
  });
  return {
    adminId: input.adminId,
    role: input.role,
    accessToken,
    refreshToken,
    session,
  };
}

export async function mintEmergencyCodeSession(input: {
  adminId: string;
  role: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  session: AdminSessionRecord;
}> {
  const store = requireStore();
  const ids = newSessionIds();
  const times = sessionExpiryIso();
  const refreshToken = randomBytes(32).toString("base64url");
  const session: AdminSessionRecord = {
    id: ids.id,
    adminId: input.adminId,
    familyId: ids.familyId,
    accessJti: ids.accessJti,
    refreshHash: hashOpaque(refreshToken),
    kind: "code_exchange_emergency",
    aal: "aal1",
    issuedAt: times.issuedAt,
    expiresAt: times.expiresAt,
    lastSeenAt: times.issuedAt,
    idleDeadline: times.idleDeadline,
    stepUpAt: null,
    revokedAt: null,
    rotatedAt: null,
  };
  await store.insertSession(session);
  const accessToken = signAdminAccessToken({
    adminId: input.adminId,
    role: input.role,
    jti: ids.accessJti,
    expiresInSec: ADMIN_ACCESS_TTL_SEC,
  });
  return { accessToken, refreshToken, session };
}

export async function rotateAdminRefresh(refreshToken: string): Promise<
  | { ok: true; accessToken: string; refreshToken: string; adminId: string; role: string }
  | { ok: false; code: typeof ADMIN_GENERIC_AUTH_FAILED }
> {
  const store = getAdminIdentityStore();
  if (!store || !refreshToken) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const previous = await store.findByRefreshHash(hashOpaque(refreshToken));
  if (!previous) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  if (previous.rotatedAt || previous.revokedAt) {
    await store.rotateSession({ previous, next: previous, reuse: true });
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }
  const cred = await store.findCredentialByAdminId(previous.adminId);
  const role = cred?.role ?? "";
  if (!cred?.active) {
    await store.revokeAllForAdmin(previous.adminId, new Date().toISOString());
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }
  const ids = newSessionIds();
  const times = sessionExpiryIso();
  const nextRefresh = randomBytes(32).toString("base64url");
  const next: AdminSessionRecord = {
    id: ids.id,
    adminId: previous.adminId,
    familyId: previous.familyId,
    accessJti: ids.accessJti,
    refreshHash: hashOpaque(nextRefresh),
    kind: previous.kind,
    aal: previous.aal,
    issuedAt: times.issuedAt,
    expiresAt: times.expiresAt,
    lastSeenAt: times.issuedAt,
    idleDeadline: times.idleDeadline,
    stepUpAt: stepUpIsFresh(previous.stepUpAt) ? previous.stepUpAt : null,
    revokedAt: null,
    rotatedAt: null,
  };
  await store.rotateSession({ previous, next, reuse: false });
  const accessToken = signAdminAccessToken({
    adminId: previous.adminId,
    role,
    jti: ids.accessJti,
    expiresInSec: ADMIN_ACCESS_TTL_SEC,
  });
  return {
    ok: true,
    accessToken,
    refreshToken: nextRefresh,
    adminId: previous.adminId,
    role,
  };
}

export async function revokeCurrentAdminFamily(accessJti: string): Promise<void> {
  const store = getAdminIdentityStore();
  if (!store || !accessJti) return;
  const resolved = await store.resolveByJti(accessJti);
  if (resolved.kind !== "active") {
    await store.revokeByJti(accessJti, new Date().toISOString());
    return;
  }
  await store.revokeFamily(resolved.session.familyId, new Date().toISOString());
}

export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  const store = getAdminIdentityStore();
  if (!store) return;
  await store.revokeAllForAdmin(adminId, new Date().toISOString());
}

export async function startAdminStepUp(adminId: string): Promise<
  | { ok: true; challengeId: string }
  | { ok: false; code: typeof ADMIN_GENERIC_AUTH_FAILED }
> {
  const store = getAdminIdentityStore();
  if (!store) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const cipher = await store.getTotp(adminId);
  if (!cipher) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const challengeId = randomBytes(24).toString("base64url");
  await store.putChallenge({
    id: randomUUID(),
    adminId,
    purpose: "step_up",
    tokenHash: hashOpaque(challengeId),
    expiresAt: new Date(Date.now() + ADMIN_CHALLENGE_TTL_MS).toISOString(),
  });
  return { ok: true, challengeId };
}

export async function finishAdminStepUp(input: {
  adminId: string;
  sessionId: string;
  challengeId: unknown;
  totp?: unknown;
  backupCode?: unknown;
}): Promise<{ ok: true } | { ok: false; code: typeof ADMIN_GENERIC_AUTH_FAILED }> {
  const store = getAdminIdentityStore();
  if (!store) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const tokenHash = hashOpaque(String(input.challengeId ?? ""));
  const pending = await store.peekChallenge(tokenHash, "step_up");
  if (!pending || pending.adminId !== input.adminId) {
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }
  const cipher = await store.getTotp(input.adminId);
  if (!cipher) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const totpOk = input.totp ? verifyTotp(decryptTotpSecret(cipher), input.totp) : false;
  const backup = String(input.backupCode ?? "").trim();
  const backupOk = backup
    ? await store.consumeBackupCode(input.adminId, hashBackupCode(backup))
    : false;
  if (!totpOk && !backupOk) return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  const consumed = await store.consumeChallenge(tokenHash, "step_up");
  if (!consumed || consumed.adminId !== input.adminId) {
    return { ok: false, code: ADMIN_GENERIC_AUTH_FAILED };
  }
  await store.markStepUp(input.sessionId, new Date().toISOString());
  return { ok: true };
}

export async function enrollAdminMfaForProvision(input: {
  adminId: string;
  usernameCanonical: string;
  password: string;
}): Promise<{ totpSecret: string; backupCodes: string[] }> {
  const store = requireStore();
  await store.upsertCredential({
    adminId: input.adminId,
    usernameCanonical: input.usernameCanonical,
    passwordHash: await hashPassword(input.password),
  });
  const totpSecret = generateTotpSecret();
  await store.putTotp(input.adminId, encryptTotpSecret(totpSecret));
  const backupCodes = generateBackupCodes();
  await store.replaceBackupCodes(
    input.adminId,
    backupCodes.map((code) => hashBackupCode(code)),
  );
  return { totpSecret, backupCodes };
}

export async function submitAdminApproval(input: {
  actionType: string;
  makerAdminId: string;
  reason: string;
  payload?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const store = requireStore();
  const id = randomUUID();
  await store.insertApproval({
    id,
    actionType: input.actionType,
    payload: input.payload ?? {},
    makerAdminId: input.makerAdminId,
    checkerAdminId: null,
    status: "pending",
    reason: input.reason,
  });
  return { id };
}

export async function decideAdminApproval(input: {
  id: string;
  checkerAdminId: string;
  approve: boolean;
}): Promise<
  | { ok: true; status: "approved" | "rejected" }
  | { ok: false; code: "ADMIN_SELF_APPROVAL_FORBIDDEN" | "ADMIN_APPROVAL_NOT_PENDING" | "ADMIN_APPROVAL_NOT_FOUND" }
> {
  const store = requireStore();
  const current = await store.getApproval(input.id);
  if (!current) return { ok: false, code: "ADMIN_APPROVAL_NOT_FOUND" };
  const plan = planMakerCheckerDecide({
    makerAdminId: current.makerAdminId,
    checkerAdminId: input.checkerAdminId,
    status: current.status,
  });
  if (!plan.ok) return plan;
  const decided = await store.decideApproval({
    id: input.id,
    checkerAdminId: input.checkerAdminId,
    status: input.approve ? "approved" : "rejected",
    decidedAt: new Date().toISOString(),
  });
  if (!decided) return { ok: false, code: "ADMIN_SELF_APPROVAL_FORBIDDEN" };
  return { ok: true, status: decided.status as "approved" | "rejected" };
}
