/**
 * 구글(및 동일 OAuth) 신규 가입 — code 재사용 없이 약관을 받는다.
 * prove() 이후 신원을 hash(pendingToken)에 짧은 TTL로 둔다.
 */

import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";

type OauthProvider = "kakao" | "google";

function hashProofSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function randomProofSecret(): string {
  return randomBytes(32).toString("base64url");
}

export const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;
export const OAUTH_PENDING_TTL_SEC = 600;

export type OauthPendingRecord = {
  tokenHash: string;
  provider: OauthProvider;
  providerSubject: string;
  emailFromProvider?: string;
  bindHash: string;
  expiresAtMs: number;
  consumedAtMs: number | null;
  userId: string | null;
};

export interface OauthPendingSignupStore {
  put(record: OauthPendingRecord): Promise<void>;
  find(tokenHash: string, nowMs: number): Promise<OauthPendingRecord | null>;
  consumeCreate(
    tokenHash: string,
    nowMs: number,
  ): Promise<OauthPendingRecord | null>;
  markUser(tokenHash: string, userId: string): Promise<void>;
}

export class MemoryOauthPendingStore implements OauthPendingSignupStore {
  private readonly rows = new Map<string, OauthPendingRecord>();

  async put(record: OauthPendingRecord): Promise<void> {
    this.rows.set(record.tokenHash, { ...record });
  }

  async find(tokenHash: string, nowMs: number): Promise<OauthPendingRecord | null> {
    const row = this.rows.get(tokenHash);
    if (!row || row.expiresAtMs <= nowMs) return null;
    return { ...row };
  }

  async consumeCreate(
    tokenHash: string,
    nowMs: number,
  ): Promise<OauthPendingRecord | null> {
    const row = this.rows.get(tokenHash);
    if (!row || row.expiresAtMs <= nowMs || row.consumedAtMs != null) return null;
    row.consumedAtMs = nowMs;
    return { ...row };
  }

  async markUser(tokenHash: string, userId: string): Promise<void> {
    const row = this.rows.get(tokenHash);
    if (row) row.userId = userId;
  }
}

export function termsPresent(body: Record<string, unknown>): boolean {
  const terms = typeof body.termsAcceptedAt === "string" && body.termsAcceptedAt.trim();
  const privacy =
    typeof body.privacyAcceptedAt === "string" && body.privacyAcceptedAt.trim();
  return Boolean(terms && privacy);
}

export function hashOauthBind(raw: string): string {
  return hashProofSecret(raw.trim());
}

export function assertOauthBind(
  cookieRaw: string | undefined,
  expectedHash: string,
): void {
  const cookie = typeof cookieRaw === "string" ? cookieRaw.trim() : "";
  if (!expectedHash) return;
  if (!cookie || hashOauthBind(cookie) !== expectedHash) {
    throw new BadRequestException("OAUTH_BIND_MISMATCH");
  }
}

export function termsRequiredBody(pendingToken: string): never {
  throw new HttpException(
    {
      code: "TERMS_REQUIRED",
      message: "TERMS_REQUIRED",
      pendingToken,
      expiresInSec: OAUTH_PENDING_TTL_SEC,
    },
    HttpStatus.BAD_REQUEST,
  );
}

export async function issueOauthPending(input: {
  store: OauthPendingSignupStore;
  provider: OauthProvider;
  providerSubject: string;
  emailFromProvider?: string;
  bindHash: string;
  nowMs: number;
}): Promise<string> {
  const pendingToken = randomProofSecret();
  await input.store.put({
    tokenHash: hashProofSecret(pendingToken),
    provider: input.provider,
    providerSubject: input.providerSubject,
    emailFromProvider: input.emailFromProvider,
    bindHash: input.bindHash,
    expiresAtMs: input.nowMs + OAUTH_PENDING_TTL_MS,
    consumedAtMs: null,
    userId: null,
  });
  return pendingToken;
}

export async function loadOauthPending(input: {
  store: OauthPendingSignupStore;
  provider: OauthProvider;
  pendingToken: string;
  bindCookie?: string;
  nowMs: number;
}): Promise<OauthPendingRecord> {
  const token =
    typeof input.pendingToken === "string" ? input.pendingToken.trim() : "";
  if (!token || token.length < 16 || token.length > 256) {
    throw new BadRequestException("OAUTH_PENDING_INVALID");
  }
  const row = await input.store.find(hashProofSecret(token), input.nowMs);
  if (!row || row.provider !== input.provider) {
    throw new BadRequestException("OAUTH_PENDING_INVALID");
  }
  assertOauthBind(input.bindCookie, row.bindHash);
  return row;
}

export async function consumeOauthPendingForCreate(input: {
  store: OauthPendingSignupStore;
  provider: OauthProvider;
  pendingToken: string;
  bindCookie?: string;
  nowMs: number;
}): Promise<OauthPendingRecord> {
  const existing = await loadOauthPending(input);
  if (existing.consumedAtMs != null) {
    if (existing.userId) return existing;
    throw new BadRequestException("OAUTH_PENDING_INVALID");
  }
  const consumed = await input.store.consumeCreate(
    existing.tokenHash,
    input.nowMs,
  );
  if (!consumed) {
    const again = await input.store.find(existing.tokenHash, input.nowMs);
    if (again?.userId) return again;
    throw new BadRequestException("OAUTH_PENDING_INVALID");
  }
  return consumed;
}
