/**
 * @aipo/sdk/wallet — PART9f
 * GET /api/v1/wallet/buckets
 */

import { resolveSdkApiBase } from "../internal/qa-loopback-api-base.js";
import type {
  CreateWithdrawInput,
  WalletBucketsResponse,
  WalletRequestOpts,
  WithdrawStepUpChallengeResponse,
  WithdrawStepUpMethod,
  WithdrawStepUpVerifyResponse,
} from "./types";

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: WalletRequestOpts,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.getAccessToken) {
    const token = await opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const MONEY_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const WALLET_BUCKET_KEYS = [
  "userId",
  "principalUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
  "asOfLedgerEntryId",
] as const;
const WALLET_OPTIONAL_KEYS = [
  "trialPrincipalUsdt",
  "trialLockedUsdt",
  "displayPrimary",
  "displaySecondary",
  "principalKrwApprox",
  "profitKrwApprox",
  "lockedKrwApprox",
  "practiceKrwApprox",
  "liabilityKrwApprox",
  "trialPrincipalKrwApprox",
  "trialLockedKrwApprox",
] as const;
const WALLET_ALLOWED_KEYS = new Set<string>([
  ...WALLET_BUCKET_KEYS,
  ...WALLET_OPTIONAL_KEYS,
]);

function walletShapeError(): Error {
  return new Error("wallet_buckets_shape");
}

function requiredText(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== "string" || !value.trim()) throw walletShapeError();
  return value;
}

function requiredMoney(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== "string" || !MONEY_RE.test(value)) {
    throw walletShapeError();
  }
  return value;
}

function optionalMoney(
  raw: Record<string, unknown>,
  key: string,
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(raw, key)) return undefined;
  return requiredMoney(raw, key);
}

function optionalNullableMoney(
  raw: Record<string, unknown>,
  key: string,
): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(raw, key)) return undefined;
  const value = raw[key];
  if (value === null) return null;
  if (typeof value !== "string" || !MONEY_RE.test(value)) {
    throw walletShapeError();
  }
  return value;
}

export function normalizeWalletBuckets(raw: unknown): WalletBucketsResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw walletShapeError();
  }
  const value = raw as Record<string, unknown>;
  const keys = Object.keys(value);
  if (
    WALLET_BUCKET_KEYS.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    keys.some((key) => !WALLET_ALLOWED_KEYS.has(key))
  ) {
    throw walletShapeError();
  }

  const dto: WalletBucketsResponse = {
    userId: requiredText(value, "userId"),
    principalUsdt: requiredMoney(value, "principalUsdt"),
    profitUsdt: requiredMoney(value, "profitUsdt"),
    lockedUsdt: requiredMoney(value, "lockedUsdt"),
    practiceUsdt: requiredMoney(value, "practiceUsdt"),
    liabilityUsdt: requiredMoney(value, "liabilityUsdt"),
    asOfLedgerEntryId: requiredText(value, "asOfLedgerEntryId"),
  };
  const trialPrincipalUsdt = optionalMoney(value, "trialPrincipalUsdt");
  const trialLockedUsdt = optionalMoney(value, "trialLockedUsdt");
  if (trialPrincipalUsdt !== undefined) dto.trialPrincipalUsdt = trialPrincipalUsdt;
  if (trialLockedUsdt !== undefined) dto.trialLockedUsdt = trialLockedUsdt;
  if (value.displayPrimary === "KRW") dto.displayPrimary = "KRW";
  else if (Object.prototype.hasOwnProperty.call(value, "displayPrimary")) {
    throw walletShapeError();
  }
  if (value.displaySecondary === "USDT") dto.displaySecondary = "USDT";
  else if (Object.prototype.hasOwnProperty.call(value, "displaySecondary")) {
    throw walletShapeError();
  }
  const krwKeys = [
    "principalKrwApprox",
    "profitKrwApprox",
    "lockedKrwApprox",
    "practiceKrwApprox",
    "liabilityKrwApprox",
    "trialPrincipalKrwApprox",
    "trialLockedKrwApprox",
  ] as const;
  for (const key of krwKeys) {
    const approx = optionalNullableMoney(value, key);
    if (approx !== undefined) dto[key] = approx;
  }
  return dto;
}

export async function fetchWalletBuckets(
  opts: WalletRequestOpts = {},
): Promise<WalletBucketsResponse> {
  const res = await fetch(
    apiUrl(resolveSdkApiBase(opts.apiBase), "/api/v1/wallet/buckets"),
    {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    },
  );
  if (!res.ok) {
    throw new Error(`wallet_buckets_${res.status}`);
  }
  return normalizeWalletBuckets(await res.json());
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
  opts: WalletRequestOpts,
  errorPrefix: string,
): Promise<unknown> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  const res = await fetch(apiUrl(resolveSdkApiBase(opts.apiBase), path), {
    method: "POST",
    headers,
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${errorPrefix}_${res.status}`);
  }
  return res.json();
}

/** PART9f2 — POST /api/v1/wallet/withdraw/step-up/challenge */
export async function createWithdrawStepUpChallenge(
  input: { method: WithdrawStepUpMethod; origin?: string; email?: string },
  opts: WalletRequestOpts = {},
): Promise<WithdrawStepUpChallengeResponse> {
  const origin =
    input.origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const raw = (await postJson(
    "/api/v1/wallet/withdraw/step-up/challenge",
    {
      method: input.method,
      origin,
      email: input.email,
    },
    opts,
    "withdraw_stepup_challenge",
  )) as WithdrawStepUpChallengeResponse;
  return raw;
}

/** PART9f2 — POST /api/v1/wallet/withdraw/step-up/verify */
export async function verifyWithdrawStepUp(
  input: {
    challengeId: string;
    method: WithdrawStepUpMethod;
    proof: string;
    origin?: string;
  },
  opts: WalletRequestOpts = {},
): Promise<WithdrawStepUpVerifyResponse> {
  const origin =
    input.origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return (await postJson(
    "/api/v1/wallet/withdraw/step-up/verify",
    {
      challengeId: input.challengeId,
      method: input.method,
      proof: input.proof,
      origin,
    },
    opts,
    "withdraw_stepup_verify",
  )) as WithdrawStepUpVerifyResponse;
}

/** PART9f2 — POST /api/v1/wallet/withdraw (idempotencyKey 필수) */
export async function createWithdraw(
  input: CreateWithdrawInput,
  opts: WalletRequestOpts = {},
): Promise<unknown> {
  return postJson(
    "/api/v1/wallet/withdraw",
    {
      mode: input.mode ?? "profit",
      amountUsdt: input.amountUsdt,
      asset: input.asset ?? "USDT",
      destination: input.destination,
      idempotencyKey: input.idempotencyKey,
      stepUpToken: input.stepUpToken,
      principalConfirmToken: input.principalConfirmToken,
    },
    opts,
    "wallet_withdraw",
  );
}

export function newWithdrawIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `wd_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `wd_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
