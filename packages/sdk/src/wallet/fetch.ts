/**
 * @aipo/sdk/wallet — PART9f
 * GET /api/v1/wallet/buckets
 */

import type {
  CreateDepositDisputeInput,
  CreateKrwDepositInput,
  CreateWithdrawInput,
  DepositDispute,
  DepositDisputeKind,
  DepositDisputeStatus,
  KycStatus,
  KycStatusResponse,
  KrwDepositFinal,
  KrwDepositQuote,
  KrwDepositRequest,
  SubmitKycInput,
  UserDepositAddress,
  WalletBucketsResponse,
  WalletJournalItem,
  WalletJournalsResponse,
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

const LEDGER_AMOUNT_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const KYC_STATUSES = new Set<KycStatus>([
  "none",
  "pending",
  "approved",
  "rejected",
]);
const USER_BUCKETS = new Set(["principal", "profit", "locked", "practice"]);

/** Real ledger zero is valid. Missing/invalid is not converted to "0". */
function asLedgerAmount(v: unknown): string | undefined {
  return typeof v === "string" && LEDGER_AMOUNT_RE.test(v) ? v : undefined;
}

export function normalizeWalletBuckets(
  raw: Partial<WalletBucketsResponse> & Record<string, unknown>,
): WalletBucketsResponse {
  const userId = typeof raw.userId === "string" ? raw.userId : "";
  const principalUsdt = asLedgerAmount(raw.principalUsdt);
  const profitUsdt = asLedgerAmount(raw.profitUsdt);
  const lockedUsdt = asLedgerAmount(raw.lockedUsdt);
  const practiceUsdt = asLedgerAmount(raw.practiceUsdt);
  const liabilityUsdt = asLedgerAmount(raw.liabilityUsdt);
  if (
    !userId ||
    !principalUsdt ||
    !profitUsdt ||
    !lockedUsdt ||
    !practiceUsdt ||
    !liabilityUsdt
  ) {
    throw new Error("wallet_buckets_unavailable");
  }
  return {
    userId,
    principalUsdt,
    profitUsdt,
    lockedUsdt,
    practiceUsdt,
    liabilityUsdt,
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

export function normalizeDepositAddress(
  raw: Partial<UserDepositAddress> & Record<string, unknown>,
): UserDepositAddress {
  const trc20Address =
    typeof raw.trc20Address === "string" ? raw.trc20Address.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId : "";
  const qrPayload = typeof raw.qrPayload === "string" ? raw.qrPayload : "";
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : "";
  if (!userId || !trc20Address || !qrPayload || !createdAt) {
    throw new Error("deposit_address_unavailable");
  }
  if (!Number.isInteger(raw.derivationIndex)) {
    throw new Error("deposit_address_unavailable");
  }
  return {
    userId,
    trc20Address,
    derivationIndex: raw.derivationIndex,
    qrPayload,
    createdAt,
    lastSeenTxAt:
      typeof raw.lastSeenTxAt === "string" ? raw.lastSeenTxAt : undefined,
  };
}

/** GET /api/v1/wallet/my-deposit-address — existing owner only. Never invents an address. */
export async function fetchMyDepositAddress(
  opts: WalletRequestOpts = {},
): Promise<UserDepositAddress> {
  const raw = (await getJson(
    "/api/v1/wallet/my-deposit-address",
    opts,
    "wallet_deposit_address",
  )) as Partial<UserDepositAddress> & Record<string, unknown>;
  return normalizeDepositAddress(raw);
}

export function normalizeKycStatus(
  raw: Partial<KycStatusResponse> & Record<string, unknown>,
): KycStatusResponse {
  const userId = typeof raw.userId === "string" ? raw.userId : "";
  const kycStatus = raw.kycStatus;
  if (!userId || !KYC_STATUSES.has(kycStatus as KycStatus)) {
    throw new Error("kyc_status_unavailable");
  }
  return {
    userId,
    kycStatus: kycStatus as KycStatus,
    submissionId:
      typeof raw.submissionId === "string" ? raw.submissionId : undefined,
    decidedAt: typeof raw.decidedAt === "string" ? raw.decidedAt : undefined,
    rejectReason:
      typeof raw.rejectReason === "string" ? raw.rejectReason : undefined,
  };
}

/** GET /api/v1/compliance/kyc/status — missing/unknown is not treated as approved. */
export async function fetchKycStatus(
  opts: WalletRequestOpts = {},
): Promise<KycStatusResponse> {
  const raw = (await getJson(
    "/api/v1/compliance/kyc/status",
    opts,
    "kyc_status",
  )) as Partial<KycStatusResponse> & Record<string, unknown>;
  return normalizeKycStatus(raw);
}

/** POST /api/v1/compliance/kyc/submit — existing Nest action only. */
export async function submitKyc(
  input: SubmitKycInput,
  opts: WalletRequestOpts = {},
): Promise<unknown> {
  return postJson(
    "/api/v1/compliance/kyc/submit",
    {
      legalName: input.legalName,
      phoneE164: input.phoneE164,
      birthDate: input.birthDate,
      idDocType: input.idDocType,
      idDocBase64: input.idDocBase64,
      selfieBase64: input.selfieBase64,
    },
    opts,
    "kyc_submit",
  );
}

function normalizeWalletJournalItem(raw: unknown): WalletJournalItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id : "";
  const journalType =
    typeof o.journalType === "string" && o.journalType.trim()
      ? o.journalType
      : "";
  const createdAt =
    typeof o.createdAt === "string" && o.createdAt.trim() ? o.createdAt : "";
  if (!id || !journalType || !createdAt) return null;
  const linesRaw = Array.isArray(o.userLines) ? o.userLines : [];
  const userLines = [];
  for (const line of linesRaw) {
    if (!line || typeof line !== "object") continue;
    const l = line as Record<string, unknown>;
    const bucket = l.bucket;
    const direction = l.direction;
    const amountUsdt = asLedgerAmount(l.amountUsdt);
    if (
      !USER_BUCKETS.has(bucket as string) ||
      (direction !== "debit" && direction !== "credit") ||
      !amountUsdt
    ) {
      continue;
    }
    userLines.push({
      bucket: bucket as WalletJournalItem["userLines"][number]["bucket"],
      direction,
      amountUsdt,
    });
  }
  if (userLines.length < 1) return null;
  return {
    id,
    journalType,
    createdAt,
    referenceType: typeof o.referenceType === "string" ? o.referenceType : null,
    referenceId: typeof o.referenceId === "string" ? o.referenceId : null,
    userLines,
  };
}

export function normalizeWalletJournals(raw: unknown): WalletJournalsResponse {
  const obj = raw && typeof raw === "object" ? (raw as { items?: unknown }) : {};
  const items = Array.isArray(obj.items) ? obj.items : [];
  return {
    items: items
      .map((item) => normalizeWalletJournalItem(item))
      .filter((item): item is WalletJournalItem => item != null),
  };
}

const DISPUTE_KINDS = new Set<DepositDisputeKind>([
  "wrong_chain",
  "mis_deposit",
]);
const DISPUTE_STATUSES = new Set<DepositDisputeStatus>([
  "open",
  "credited",
  "rejected",
]);

export function newDepositDisputeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `dd_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `dd_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeDepositDispute(
  raw: Partial<DepositDispute> & Record<string, unknown>,
): DepositDispute {
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : "";
  const linkedTxHash =
    typeof raw.linkedTxHash === "string" && raw.linkedTxHash.trim()
      ? raw.linkedTxHash
      : "";
  if (
    !id ||
    !linkedTxHash ||
    !DISPUTE_KINDS.has(raw.kind as DepositDisputeKind) ||
    !DISPUTE_STATUSES.has(raw.status as DepositDisputeStatus)
  ) {
    throw new Error("deposit_dispute_unavailable");
  }
  return {
    id,
    kind: raw.kind as DepositDisputeKind,
    status: raw.status as DepositDisputeStatus,
    linkedTxHash,
  };
}

/** POST /api/v1/wallet/deposit-disputes — existing Nest CS entry only. */
export async function createDepositDispute(
  input: CreateDepositDisputeInput,
  opts: WalletRequestOpts = {},
): Promise<DepositDispute> {
  const linkedTxHash = input.linkedTxHash.trim();
  if (linkedTxHash.length < 8) {
    throw new Error("deposit_dispute_unavailable");
  }
  const raw = (await postJson(
    "/api/v1/wallet/deposit-disputes",
    {
      kind: input.kind,
      linkedTxHash,
      networkClaimedKo: input.networkClaimedKo,
      idempotencyKey: input.idempotencyKey,
    },
    opts,
    "deposit_dispute",
  )) as Partial<DepositDispute> & Record<string, unknown>;
  return normalizeDepositDispute(raw);
}

/** GET /api/v1/wallet/journals — session user projection only. */
export async function listWalletJournals(
  opts: WalletRequestOpts = {},
): Promise<WalletJournalsResponse> {
  const raw = await getJson(
    "/api/v1/wallet/journals",
    opts,
    "wallet_journals",
  );
  return normalizeWalletJournals(raw);
}
