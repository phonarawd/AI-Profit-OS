/**
 * @aipo/sdk/wallet — PART9f
 * GET /api/v1/wallet/buckets
 */

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

function asAmount(v: unknown): string {
  return typeof v === "string" && v.trim() ? v : "0";
}

export function normalizeWalletBuckets(
  raw: Partial<WalletBucketsResponse> & Record<string, unknown>,
): WalletBucketsResponse {
  return {
    userId: typeof raw.userId === "string" ? raw.userId : "",
    principalUsdt: asAmount(raw.principalUsdt),
    profitUsdt: asAmount(raw.profitUsdt),
    lockedUsdt: asAmount(raw.lockedUsdt),
    practiceUsdt: asAmount(raw.practiceUsdt),
    liabilityUsdt: asAmount(raw.liabilityUsdt),
    asOfLedgerEntryId:
      typeof raw.asOfLedgerEntryId === "string"
        ? raw.asOfLedgerEntryId
        : "none",
  };
}

export async function fetchWalletBuckets(
  opts: WalletRequestOpts = {},
): Promise<WalletBucketsResponse> {
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/wallet/buckets"),
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
  const raw = (await res.json()) as Partial<WalletBucketsResponse> &
    Record<string, unknown>;
  return normalizeWalletBuckets(raw);
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
  opts: WalletRequestOpts,
  errorPrefix: string,
): Promise<unknown> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  const res = await fetch(apiUrl(opts.apiBase ?? "", path), {
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
