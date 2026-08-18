/**
 * eBay Browse API client — item_summary/search per marketplaceId.
 * Dry-run when credentials missing (Phase1 deploy health still ok).
 *
 * PTF-00C P0-C/§7 repair: explicit per-request timeout, bounded retry with
 * exponential backoff + jitter (transient classes only), error
 * classification (auth/rate-limit/5xx/timeout/network/malformed), and
 * per-marketplace/per-query result isolation — one failing call must never
 * discard another marketplace's/query's healthy result or crash the tick.
 *
 * PTF-00C-R1 §3 repair (nested retry amplification):
 * - Token acquisition (`getAppToken`) owns its OWN bounded retry and is
 *   called EXACTLY ONCE per tick by the caller (index.ts `runTick`) — never
 *   from inside `searchOnce`/`searchItemSummary` anymore. Previously
 *   `searchOnce` called `getAppToken` itself, so `searchItemSummary`'s
 *   outer bounded retry (up to DEFAULT_MAX_ATTEMPTS) re-entered the token's
 *   OWN bounded retry (up to DEFAULT_MAX_ATTEMPTS) on every attempt — up to
 *   DEFAULT_MAX_ATTEMPTS² token HTTP calls for a single query, repeated
 *   independently per marketplace×query. `searchItemSummary`/`searchOnce`
 *   now take an already-resolved `token` and only ever retry the Browse
 *   fetch itself — see index.ts for the exact upstream-call upper bound.
 *
 * PTF-00C-R1 §4/§6 repair (tick runtime budget): every upstream call takes
 * an optional `deadlineAtMs`. Its own per-request timeout is shrunk to
 * whatever tick budget remains, and no retry is attempted once the budget
 * is effectively exhausted — see `deadline_exceeded` classification below.
 */

import {
  applyFullJitter,
  backoffDelayMs,
  classifyHttpStatus,
  classifyThrown,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT_MS,
  shouldRetry,
  type EbayErrorClass,
} from "./retry-policy.cjs";
import {
  BROWSE_BASE,
  IDENTITY_BASE,
  MIN_CALL_BUDGET_MS,
  OAUTH_SCOPE,
  type EbayMarketplaceId,
} from "./constants";

export interface BrowseSearchItem {
  itemId: string;
  title: string;
  priceValue: string;
  currency: string;
  imageUrl?: string;
  itemWebUrl?: string;
}

export interface BrowseSearchResult {
  marketplaceId: EbayMarketplaceId;
  query: string;
  items: BrowseSearchItem[];
  dryRun: boolean;
  error?: string;
  /** PTF-00C — always present on failure so Nest/heartbeat can classify without parsing free text. */
  errorClass?: EbayErrorClass;
  attempts: number;
}

let cachedToken: { value: string; expMs: number } | null = null;

/**
 * Test-only — clears the module-level token cache so fault-injection
 * scenarios in fault-injection.selftest.ts start from a known state. Never
 * called from the deployed Worker entrypoints (index.ts).
 */
export function __resetTokenCacheForTests(): void {
  cachedToken = null;
}

/** Remaining ms until `deadlineAtMs`, or +Infinity when no deadline is set. */
function remainingBudgetMs(deadlineAtMs?: number): number {
  return deadlineAtMs == null ? Number.POSITIVE_INFINITY : deadlineAtMs - Date.now();
}

/**
 * The per-request timeout to use right now — never longer than the
 * caller's base timeout, never longer than what tick budget remains.
 */
function effectiveTimeoutMs(deadlineAtMs: number | undefined, base = DEFAULT_TIMEOUT_MS): number {
  const remaining = remainingBudgetMs(deadlineAtMs);
  if (!Number.isFinite(remaining)) return base;
  return Math.max(0, Math.min(base, remaining));
}

/** Fetch with an explicit abort timeout — never let one call hang the tick. */
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Sleep helper — only ever invoked between bounded retry attempts. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryOutcome<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; error: string; errorClass: EbayErrorClass; attempts: number };

/**
 * Bounded retry wrapper — transient classes (rate_limited/server_error/
 * timeout/network_error) retry with exponential backoff + full jitter;
 * auth_failed/client_error/malformed_response never retry (§7 "authentication
 * failure classification" / "malformed response classification").
 *
 * PTF-00C-R1 §4 — when `deadlineAtMs` is supplied, a new attempt (including
 * the very first) is never started once the remaining tick budget drops to
 * MIN_CALL_BUDGET_MS or below. The outcome is classified `deadline_exceeded`
 * — distinct from a per-request `timeout` — so evidence can tell "this
 * specific call didn't answer in time" apart from "the tick ran out of
 * overall budget and stopped trying".
 */
async function withRetry<T>(
  attemptFn: () => Promise<T>,
  classifyError: (err: unknown) => { message: string; errorClass: EbayErrorClass },
  opts: { maxAttempts?: number; deadlineAtMs?: number } = {},
): Promise<RetryOutcome<T>> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastMessage = "unknown_failure";
  let lastErrorClass: EbayErrorClass = "unknown";
  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    if (remainingBudgetMs(opts.deadlineAtMs) <= MIN_CALL_BUDGET_MS) {
      return {
        ok: false,
        error: "tick_deadline_exceeded",
        errorClass: "deadline_exceeded",
        attempts: attemptIndex,
      };
    }
    try {
      const value = await attemptFn();
      return { ok: true, value, attempts: attemptIndex + 1 };
    } catch (e) {
      const { message, errorClass } = classifyError(e);
      lastMessage = message;
      lastErrorClass = errorClass;
      if (!shouldRetry({ attemptIndex, errorClass, maxAttempts })) {
        return { ok: false, error: message, errorClass, attempts: attemptIndex + 1 };
      }
      if (remainingBudgetMs(opts.deadlineAtMs) <= MIN_CALL_BUDGET_MS) {
        return {
          ok: false,
          error: "tick_deadline_exceeded",
          errorClass: "deadline_exceeded",
          attempts: attemptIndex + 1,
        };
      }
      const delay = applyFullJitter(backoffDelayMs(attemptIndex));
      await sleep(delay);
    }
  }
  return { ok: false, error: lastMessage, errorClass: lastErrorClass, attempts: maxAttempts };
}

class ClassifiedError extends Error {
  errorClass: EbayErrorClass;
  constructor(message: string, errorClass: EbayErrorClass) {
    super(message);
    this.errorClass = errorClass;
  }
}

function classifyCaught(e: unknown): { message: string; errorClass: EbayErrorClass } {
  if (e instanceof ClassifiedError) return { message: e.message, errorClass: e.errorClass };
  const errorClass = classifyThrown(e);
  const message = e instanceof Error ? e.message : "browse_failed";
  return { message, errorClass };
}

async function fetchAppTokenOnce(
  clientId: string,
  clientSecret: string,
  deadlineAtMs?: number,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expMs > now + 60_000) {
    return cachedToken.value;
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: OAUTH_SCOPE,
  });
  const res = await fetchWithTimeout(
    `${IDENTITY_BASE}/oauth2/token`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    },
    effectiveTimeoutMs(deadlineAtMs),
  );
  if (!res.ok) {
    throw new ClassifiedError(`ebay oauth ${res.status}`, classifyHttpStatus(res.status));
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: json.access_token,
    expMs: now + (json.expires_in ?? 7200) * 1000,
  };
  return cachedToken.value;
}

/**
 * PTF-00C-R1 §3 — the ONLY bounded-retry layer for token acquisition.
 * Callers (index.ts `runTick`) invoke this EXACTLY ONCE per scheduled tick
 * as a preflight step, never once per marketplace/query — see the module
 * docstring for the amplification this replaces.
 */
export async function getAppToken(
  clientId: string,
  clientSecret: string,
  deadlineAtMs?: number,
): Promise<string> {
  const outcome = await withRetry(
    () => fetchAppTokenOnce(clientId, clientSecret, deadlineAtMs),
    classifyCaught,
    { deadlineAtMs },
  );
  if (!outcome.ok) {
    throw new ClassifiedError(outcome.error, outcome.errorClass);
  }
  return outcome.value;
}

async function searchOnce(opts: {
  marketplaceId: EbayMarketplaceId;
  query: string;
  token: string;
  limit?: number;
  deadlineAtMs?: number;
}): Promise<BrowseSearchItem[]> {
  const url = new URL(`${BROWSE_BASE}/item_summary/search`);
  url.searchParams.set("q", opts.query);
  url.searchParams.set("limit", String(opts.limit ?? 10));
  const res = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        authorization: `Bearer ${opts.token}`,
        "X-EBAY-C-MARKETPLACE-ID": opts.marketplaceId,
        accept: "application/json",
      },
    },
    effectiveTimeoutMs(opts.deadlineAtMs),
  );
  if (!res.ok) {
    throw new ClassifiedError(`browse ${res.status}`, classifyHttpStatus(res.status));
  }
  let json: {
    itemSummaries?: Array<{
      itemId?: string;
      title?: string;
      price?: { value?: string; currency?: string };
      image?: { imageUrl?: string };
      itemWebUrl?: string;
    }>;
  };
  try {
    json = (await res.json()) as typeof json;
  } catch (e) {
    throw new ClassifiedError(
      e instanceof Error ? e.message : "malformed_json",
      "malformed_response",
    );
  }
  return (json.itemSummaries ?? [])
    .filter((it) => it.itemId && it.price?.value)
    .map((it) => ({
      itemId: String(it.itemId),
      title: String(it.title ?? ""),
      priceValue: String(it.price!.value),
      currency: String(it.price!.currency ?? "USD"),
      imageUrl: it.image?.imageUrl,
      itemWebUrl: it.itemWebUrl,
    }));
}

/**
 * PTF-00C-R1 §3 — takes an already-resolved `token` (from ONE per-tick
 * `getAppToken` preflight call) instead of client credentials. The bounded
 * retry here covers ONLY the Browse fetch itself — no nested token retry —
 * so the maximum upstream calls per query is exactly DEFAULT_MAX_ATTEMPTS
 * (see index.ts for the whole-tick upper bound derivation).
 *
 * `dryRun`/`token=null` short-circuits with zero network calls, same as the
 * pre-R1 "no credentials configured" behavior.
 */
export async function searchItemSummary(opts: {
  marketplaceId: EbayMarketplaceId;
  query: string;
  token: string | null;
  dryRun?: boolean;
  limit?: number;
  deadlineAtMs?: number;
}): Promise<BrowseSearchResult> {
  const { marketplaceId, query } = opts;
  if (opts.dryRun || !opts.token) {
    return { marketplaceId, query, items: [], dryRun: true, attempts: 0 };
  }
  const token = opts.token;
  const outcome = await withRetry(
    () =>
      searchOnce({
        marketplaceId,
        query,
        token,
        limit: opts.limit,
        deadlineAtMs: opts.deadlineAtMs,
      }),
    classifyCaught,
    { deadlineAtMs: opts.deadlineAtMs },
  );
  if (!outcome.ok) {
    return {
      marketplaceId,
      query,
      items: [],
      dryRun: false,
      error: outcome.error,
      errorClass: outcome.errorClass,
      attempts: outcome.attempts,
    };
  }
  return {
    marketplaceId,
    query,
    items: outcome.value,
    dryRun: false,
    attempts: outcome.attempts,
  };
}
