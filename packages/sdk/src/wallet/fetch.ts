/**
 * @aipo/sdk/wallet — PART9f
 * GET /api/v1/wallet/buckets
 */

import type {
  CreateKrwDepositInput,
  CreateWithdrawInput,
  KrwDepositFinal,
  KrwDepositQuote,
  KrwDepositRequest,
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

const POSITIVE_DECIMAL = /^[0-9]+(\.[0-9]+)?$/;

function asPositiveDecimal(v: unknown): string | undefined {
  if (typeof v !== "string" || !POSITIVE_DECIMAL.test(v)) return undefined;
  if (/^0+(\.0+)?$/.test(v)) return undefined;
  return v;
}

function asOptionalText(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function normalizeQuote(raw: unknown): KrwDepositQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const fxSnapshotId = asOptionalText(q.fxSnapshotId);
  const usdtKrw = asPositiveDecimal(q.usdtKrw);
  const estimatedUsdt = asPositiveDecimal(q.estimatedUsdt);
  if (!fxSnapshotId || !usdtKrw || !estimatedUsdt) return null;
  return {
    fxSnapshotId,
    usdtKrw,
    estimatedUsdt,
    formulaId: asOptionalText(q.formulaId),
    capturedAt: asOptionalText(q.capturedAt),
  };
}

function normalizeFinal(raw: unknown): KrwDepositFinal | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const appliedFxSnapshotId = asOptionalText(f.appliedFxSnapshotId);
  const appliedUsdtKrw = asPositiveDecimal(f.appliedUsdtKrw);
  const creditedUsdt = asPositiveDecimal(f.creditedUsdt);
  if (!appliedFxSnapshotId || !appliedUsdtKrw || !creditedUsdt) return null;
  return {
    appliedFxSnapshotId,
    appliedUsdtKrw,
    creditedUsdt,
    appliedFormulaId: asOptionalText(f.appliedFormulaId),
    appliedFxCapturedAt: asOptionalText(f.appliedFxCapturedAt),
    decidedAt: asOptionalText(f.decidedAt),
    ledgerJournalId: asOptionalText(f.ledgerJournalId),
  };
}

/** Server facts only — client must not compute payable/rate. */
export function normalizeKrwDepositRequest(
  raw: Partial<KrwDepositRequest> & Record<string, unknown>,
): KrwDepositRequest {
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    userId: typeof raw.userId === "string" ? raw.userId : "",
    requestedAmountKrw:
      typeof raw.requestedAmountKrw === "number" ? raw.requestedAmountKrw : 0,
    payableAmountKrw:
      typeof raw.payableAmountKrw === "number" ? raw.payableAmountKrw : 0,
    uniqueSuffixKrw:
      typeof raw.uniqueSuffixKrw === "number" ? raw.uniqueSuffixKrw : 0,
    payableSuffixRole: "bank_transfer_identification",
    depositCode: typeof raw.depositCode === "string" ? raw.depositCode : "",
    depositorName: typeof raw.depositorName === "string" ? raw.depositorName : "",
    status: typeof raw.status === "string" ? raw.status : "",
    expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : "",
    estimatedUsdt: asPositiveDecimal(raw.estimatedUsdt),
    quote: normalizeQuote(raw.quote),
    final: normalizeFinal(raw.final),
    ledgerJournalId: asOptionalText(raw.ledgerJournalId),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    decidedAt: asOptionalText(raw.decidedAt),
  };
}

async function getJson(
  path: string,
  opts: WalletRequestOpts,
  errorPrefix: string,
): Promise<unknown> {
  const res = await fetch(apiUrl(opts.apiBase ?? "", path), {
    method: "GET",
    headers: await authHeaders(opts),
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`${errorPrefix}_${res.status}`);
  }
  return res.json();
}

export async function createKrwDepositRequest(
  input: CreateKrwDepositInput,
  opts: WalletRequestOpts = {},
): Promise<KrwDepositRequest> {
  const raw = (await postJson(
    "/api/v1/wallet/krw-deposit-requests",
    {
      requestedAmountKrw: input.requestedAmountKrw,
      depositorName: input.depositorName,
      idempotencyKey: input.idempotencyKey,
    },
    opts,
    "krw_deposit_create",
  )) as Partial<KrwDepositRequest> & Record<string, unknown>;
  return normalizeKrwDepositRequest(raw);
}

export async function listKrwDepositRequests(
  opts: WalletRequestOpts = {},
): Promise<{ items: KrwDepositRequest[] }> {
  const raw = (await getJson(
    "/api/v1/wallet/krw-deposit-requests",
    opts,
    "krw_deposit_list",
  )) as { items?: unknown };
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    items: items.map((item) =>
      normalizeKrwDepositRequest(
        (item ?? {}) as Partial<KrwDepositRequest> & Record<string, unknown>,
      ),
    ),
  };
}

export async function getKrwDepositRequest(
  id: string,
  opts: WalletRequestOpts = {},
): Promise<KrwDepositRequest> {
  const raw = (await getJson(
    `/api/v1/wallet/krw-deposit-requests/${encodeURIComponent(id)}`,
    opts,
    "krw_deposit_get",
  )) as Partial<KrwDepositRequest> & Record<string, unknown>;
  return normalizeKrwDepositRequest(raw);
}

export function newWithdrawIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `wd_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `wd_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
