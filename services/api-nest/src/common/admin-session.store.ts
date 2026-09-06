/**
 * Durable Admin session / identity store 레지스트리.
 * 프로세스 Map 은 캐시일 뿐이며 권위가 아니다.
 */

import { randomUUID } from "node:crypto";

export type AdminSessionKind = "password_mfa" | "code_exchange_emergency";
export type AdminAal = "aal1" | "aal2";

const ADMIN_IDLE_TTL_MS = 30 * 60 * 1000;
const ADMIN_REFRESH_TTL_SEC = 12 * 60 * 60;

export type AdminSessionRecord = {
  id: string;
  adminId: string;
  familyId: string;
  accessJti: string;
  refreshHash: string;
  kind: AdminSessionKind;
  aal: AdminAal;
  issuedAt: string;
  expiresAt: string;
  lastSeenAt: string;
  idleDeadline: string;
  stepUpAt: string | null;
  revokedAt: string | null;
  rotatedAt: string | null;
};

export type AdminSessionResolution =
  | { kind: "unwired" }
  | { kind: "unavailable" }
  | { kind: "missing" }
  | { kind: "revoked" }
  | { kind: "idle" }
  | { kind: "expired" }
  | { kind: "active"; session: AdminSessionRecord };

export type AdminCredentialRow = {
  adminId: string;
  usernameCanonical: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: string | null;
  email: string;
  role: string;
  active: boolean;
};

export type AdminApprovalRow = {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
  makerAdminId: string;
  checkerAdminId: string | null;
  status: string;
  reason: string;
};

export type AdminIdentityStore = {
  findCredentialByIdentifier(identifier: string): Promise<AdminCredentialRow | null>;
  findCredentialByAdminId(adminId: string): Promise<AdminCredentialRow | null>;
  putCredentialRow(row: AdminCredentialRow): Promise<void>;
  upsertCredential(row: {
    adminId: string;
    usernameCanonical: string;
    passwordHash: string;
  }): Promise<void>;
  updateCredentialLock(input: {
    adminId: string;
    failedAttempts: number;
    lockedUntil: string | null;
  }): Promise<void>;
  putTotp(adminId: string, secretCiphertext: string): Promise<void>;
  getTotp(adminId: string): Promise<string | null>;
  replaceBackupCodes(adminId: string, codeHashes: string[]): Promise<void>;
  consumeBackupCode(adminId: string, codeHash: string): Promise<boolean>;
  putChallenge(input: {
    id: string;
    adminId: string;
    purpose: "login_mfa" | "step_up";
    tokenHash: string;
    expiresAt: string;
  }): Promise<void>;
  consumeChallenge(tokenHash: string, purpose: "login_mfa" | "step_up"): Promise<{
    adminId: string;
  } | null>;
  insertSession(row: AdminSessionRecord): Promise<void>;
  resolveByJti(accessJti: string, nowMs?: number): Promise<AdminSessionResolution>;
  findByRefreshHash(refreshHash: string): Promise<AdminSessionRecord | null>;
  touchSession(id: string, nowMs?: number): Promise<void>;
  markStepUp(id: string, atIso: string): Promise<void>;
  revokeByJti(accessJti: string, atIso: string): Promise<void>;
  revokeFamily(familyId: string, atIso: string): Promise<void>;
  revokeAllForAdmin(adminId: string, atIso: string): Promise<void>;
  rotateSession(input: {
    previous: AdminSessionRecord;
    next: AdminSessionRecord;
    reuse: boolean;
  }): Promise<void>;
  consumeCodeExchange(tokenHash: string, expiresAt: string): Promise<boolean>;
  isCodeExchangeConsumed(tokenHash: string): Promise<boolean>;
  insertApproval(row: AdminApprovalRow): Promise<void>;
  getApproval(id: string): Promise<AdminApprovalRow | null>;
  decideApproval(input: {
    id: string;
    checkerAdminId: string;
    status: "approved" | "rejected";
    decidedAt: string;
  }): Promise<AdminApprovalRow | null>;
};

type SessionLookupFn = (input: {
  tokenId: string;
  adminId: string;
}) => Promise<AdminSessionResolution>;

let identityStore: AdminIdentityStore | null = null;
let sessionLookup: SessionLookupFn | null = null;

export function registerAdminIdentityStore(store: AdminIdentityStore): void {
  identityStore = store;
}

export function clearAdminIdentityStore(): void {
  identityStore = null;
}

export function getAdminIdentityStore(): AdminIdentityStore | null {
  return identityStore;
}

export function registerAdminSessionLookup(fn: SessionLookupFn): void {
  sessionLookup = fn;
}

export function clearAdminSessionLookup(): void {
  sessionLookup = null;
}

export async function resolveAdminSession(input: {
  tokenId: string;
  adminId: string;
}): Promise<AdminSessionResolution> {
  if (!sessionLookup) return { kind: "unwired" };
  try {
    return await sessionLookup(input);
  } catch {
    return { kind: "unavailable" };
  }
}

export function evaluateSessionRecord(
  row: AdminSessionRecord | null,
  nowMs = Date.now(),
): AdminSessionResolution {
  if (!row) return { kind: "missing" };
  if (row.revokedAt) return { kind: "revoked" };
  if (Date.parse(row.expiresAt) <= nowMs) return { kind: "expired" };
  if (Date.parse(row.idleDeadline) <= nowMs) return { kind: "idle" };
  return { kind: "active", session: row };
}

export function createMemoryAdminIdentityStore(): AdminIdentityStore {
  const credentials = new Map<string, AdminCredentialRow>();
  const totp = new Map<string, string>();
  const backups = new Map<string, { hash: string; consumed: boolean }[]>();
  const challenges = new Map<
    string,
    { adminId: string; purpose: string; expiresAt: string; consumed: boolean }
  >();
  const sessions = new Map<string, AdminSessionRecord>();
  const exchanges = new Set<string>();
  const approvals = new Map<string, AdminApprovalRow>();

  function sessionByJti(jti: string): AdminSessionRecord | null {
    for (const row of sessions.values()) {
      if (row.accessJti === jti) return row;
    }
    return null;
  }

  return {
    async findCredentialByIdentifier(identifier) {
      for (const row of credentials.values()) {
        if (
          row.usernameCanonical === identifier ||
          row.email.toLowerCase() === identifier
        ) {
          return { ...row };
        }
      }
      return null;
    },
    async findCredentialByAdminId(adminId) {
      const row = credentials.get(adminId);
      return row ? { ...row } : null;
    },
    async putCredentialRow(row) {
      credentials.set(row.adminId, { ...row });
    },
    async upsertCredential(row) {
      const prev = credentials.get(row.adminId);
      credentials.set(row.adminId, {
        adminId: row.adminId,
        usernameCanonical: row.usernameCanonical,
        passwordHash: row.passwordHash,
        failedAttempts: prev?.failedAttempts ?? 0,
        lockedUntil: prev?.lockedUntil ?? null,
        email: prev?.email ?? `${row.usernameCanonical}@admins.local`,
        role: prev?.role ?? "super",
        active: prev?.active ?? true,
      });
    },
    async updateCredentialLock(input) {
      const prev = credentials.get(input.adminId);
      if (!prev) return;
      credentials.set(input.adminId, {
        ...prev,
        failedAttempts: input.failedAttempts,
        lockedUntil: input.lockedUntil,
      });
    },
    async putTotp(adminId, secretCiphertext) {
      totp.set(adminId, secretCiphertext);
    },
    async getTotp(adminId) {
      return totp.get(adminId) ?? null;
    },
    async replaceBackupCodes(adminId, codeHashes) {
      backups.set(
        adminId,
        codeHashes.map((hash) => ({ hash, consumed: false })),
      );
    },
    async consumeBackupCode(adminId, codeHash) {
      const list = backups.get(adminId) ?? [];
      const found = list.find((item) => item.hash === codeHash && !item.consumed);
      if (!found) return false;
      found.consumed = true;
      return true;
    },
    async putChallenge(input) {
      challenges.set(input.tokenHash, {
        adminId: input.adminId,
        purpose: input.purpose,
        expiresAt: input.expiresAt,
        consumed: false,
      });
    },
    async consumeChallenge(tokenHash, purpose) {
      const row = challenges.get(tokenHash);
      if (!row || row.consumed || row.purpose !== purpose) return null;
      if (Date.parse(row.expiresAt) <= Date.now()) return null;
      row.consumed = true;
      return { adminId: row.adminId };
    },
    async insertSession(row) {
      sessions.set(row.id, { ...row });
    },
    async resolveByJti(accessJti, nowMs) {
      return evaluateSessionRecord(sessionByJti(accessJti), nowMs);
    },
    async findByRefreshHash(refreshHash) {
      for (const row of sessions.values()) {
        if (row.refreshHash === refreshHash && !row.rotatedAt && !row.revokedAt) {
          return { ...row };
        }
      }
      return null;
    },
    async touchSession(id, nowMs = Date.now()) {
      const row = sessions.get(id);
      if (!row || row.revokedAt) return;
      row.lastSeenAt = new Date(nowMs).toISOString();
      row.idleDeadline = new Date(nowMs + ADMIN_IDLE_TTL_MS).toISOString();
    },
    async markStepUp(id, atIso) {
      const row = sessions.get(id);
      if (!row) return;
      row.stepUpAt = atIso;
    },
    async revokeByJti(accessJti, atIso) {
      const row = sessionByJti(accessJti);
      if (row) row.revokedAt = atIso;
    },
    async revokeFamily(familyId, atIso) {
      for (const row of sessions.values()) {
        if (row.familyId === familyId) row.revokedAt = atIso;
      }
    },
    async revokeAllForAdmin(adminId, atIso) {
      for (const row of sessions.values()) {
        if (row.adminId === adminId) row.revokedAt = atIso;
      }
    },
    async rotateSession(input) {
      const prev = sessions.get(input.previous.id);
      if (!prev) return;
      if (input.reuse) {
        for (const row of sessions.values()) {
          if (row.familyId === prev.familyId) row.revokedAt = new Date().toISOString();
        }
        return;
      }
      prev.rotatedAt = input.next.issuedAt;
      sessions.set(input.next.id, { ...input.next });
    },
    async consumeCodeExchange(tokenHash, _expiresAt) {
      if (exchanges.has(tokenHash)) return false;
      exchanges.add(tokenHash);
      return true;
    },
    async isCodeExchangeConsumed(tokenHash) {
      return exchanges.has(tokenHash);
    },
    async insertApproval(row) {
      approvals.set(row.id, { ...row });
    },
    async getApproval(id) {
      const row = approvals.get(id);
      return row ? { ...row } : null;
    },
    async decideApproval(input) {
      const row = approvals.get(input.id);
      if (!row) return null;
      row.checkerAdminId = input.checkerAdminId;
      row.status = input.status;
      return { ...row };
    },
  };
}

export function newSessionIds(): { id: string; familyId: string; accessJti: string } {
  return {
    id: randomUUID(),
    familyId: randomUUID(),
    accessJti: randomUUID(),
  };
}

export function sessionExpiryIso(nowMs = Date.now()): {
  issuedAt: string;
  expiresAt: string;
  idleDeadline: string;
} {
  return {
    issuedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ADMIN_REFRESH_TTL_SEC * 1000).toISOString(),
    idleDeadline: new Date(nowMs + ADMIN_IDLE_TTL_MS).toISOString(),
  };
}
