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

const MONEY_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const WITHDRAW_AMOUNT_RE = /^([0-9]+)(?:\.([0-9]+))?$/;
const WITHDRAW_AMOUNT_SCALE = 18;
const WALLET_BUCKET_KEYS = [
  "userId",
  "principalUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
  "asOfLedgerEntryId",
] as const;

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

export function normalizeWalletBuckets(raw: unknown): WalletBucketsResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw walletShapeError();
  }
  const value = raw as Record<string, unknown>;
  const keys = Object.keys(value);
  if (
    keys.length !== WALLET_BUCKET_KEYS.length ||
    keys.some(
      (key) =>
        !WALLET_BUCKET_KEYS.includes(
          key as (typeof WALLET_BUCKET_KEYS)[number],
        ),
    )
  ) {
    throw walletShapeError();
  }

  return {
    userId: requiredText(value, "userId"),
    principalUsdt: requiredMoney(value, "principalUsdt"),
    profitUsdt: requiredMoney(value, "profitUsdt"),
    lockedUsdt: requiredMoney(value, "lockedUsdt"),
    practiceUsdt: requiredMoney(value, "practiceUsdt"),
    liabilityUsdt: requiredMoney(value, "liabilityUsdt"),
    asOfLedgerEntryId: requiredText(value, "asOfLedgerEntryId"),
  };
}

/**
 * Canonicalizes a positive USDT amount to the API ledger's 18-decimal format.
 * Presentation-only changes such as `1`, `1.0`, and `01.000` must keep the
 * same idempotency fingerprint after an ambiguous network response.
 */
export function normalizeWithdrawAmountUsdt(raw: string): string {
  const value = raw.trim();
  const match = WITHDRAW_AMOUNT_RE.exec(value);
  if (!match) throw new Error("withdraw_amount_invalid");

  const whole = match[1];
  const fraction = match[2] ?? "";
  if (fraction.length > WITHDRAW_AMOUNT_SCALE) {
    throw new Error("withdraw_amount_scale");
  }

  const scaled = BigInt(
    `${whole}${fraction.padEnd(WITHDRAW_AMOUNT_SCALE, "0")}`,
  );
  if (scaled <= 0n) throw new Error("withdraw_amount_invalid");

  const padded = scaled.toString().padStart(WITHDRAW_AMOUNT_SCALE + 1, "0");
  const canonicalWhole = padded.slice(0, -WITHDRAW_AMOUNT_SCALE) || "0";
  const canonicalFraction = padded
    .slice(-WITHDRAW_AMOUNT_SCALE)
    .replace(/0+$/, "");
  return canonicalFraction
    ? `${canonicalWhole}.${canonicalFraction}`
    : canonicalWhole;
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
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("secure_random_unavailable");
  }
  return `wd_${crypto.randomUUID().replace(/-/g, "")}`;
}
