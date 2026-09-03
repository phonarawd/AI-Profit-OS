/**
 * PTF-00C-R1 §3/§4/§7 — real runtime fault-injection selftest for the
 * ebay-adapter worker's tick logic. `global.fetch` is replaced with a
 * controlled fake for the duration of each scenario — NO live eBay call is
 * ever made. This exercises the ACTUAL `runTick`/`getAppToken`/
 * `searchItemSummary` control flow (real await chains, real retry/deadline
 * bookkeeping), not a static regex over the source text.
 *
 * NOT wired into the deployed Worker bundle — invoked only by
 * tooling/verify/ebay-resilience.cjs via
 * `node dist-selftest/fault-injection.selftest.js` after a scoped tsc build
 * (workers/ebay-adapter/tsconfig.selftest.json), mirroring the
 * services/api-nest `*.selftest.ts` + tooling/verify pattern.
 */
import { runTick, type Env } from "./index";
import { __resetTokenCacheForTests } from "./browse-api";
import { DEFAULT_MAX_ATTEMPTS } from "./retry-policy.cjs";
import { BROWSE_BASE, IDENTITY_BASE, MIN_CALL_BUDGET_MS } from "./constants";

// This selftest's tsconfig deliberately excludes @types/node (the deployed
// Worker never runs on Node) — declare just enough of the real Node global
// that IS present at runtime when tooling/verify executes this via `node`.
declare const process: { exit(code: number): never };

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail });

const realFetch = globalThis.fetch;

type Call = { url: string; body: string | null };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(text: string, status = 200): Response {
  return new Response(text, { status, headers: { "content-type": "application/json" } });
}

/** Never resolves on its own — only rejects when the caller's AbortSignal fires. */
function hangingResponse(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise((_resolve, reject) => {
    if (!signal) return;
    signal.addEventListener("abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
}

type FetchFn = (url: string, init: RequestInit | undefined, calls: Call[]) => Promise<Response>;

function installFetch(fn: FetchFn, calls: Call[]): void {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, body: init && typeof init.body === "string" ? init.body : null });
    return fn(url, init, calls);
  }) as typeof fetch;
}

function restoreFetch(): void {
  globalThis.fetch = realFetch;
}

function countMatching(calls: Call[], needle: string): number {
  return calls.filter((c) => c.url.includes(needle)).length;
}

function tokenCalls(calls: Call[]): number {
  return countMatching(calls, IDENTITY_BASE);
}

function browseCalls(calls: Call[]): number {
  return countMatching(calls, BROWSE_BASE);
}

function ingestCalls(calls: Call[]): Call[] {
  return calls.filter((c) => c.url.includes("/adapters/ingest"));
}

function baseEnv(overrides: Partial<Env> = {}): Env {
  return {
    SERVICE: "ebay-adapter",
    PHASE: "1",
    EBAY_CLIENT_ID: "selftest-client-id",
    EBAY_CLIENT_SECRET: "selftest-client-secret",
    EBAY_MARKETPLACES: "EBAY_US,EBAY_GB",
    EBAY_SEARCH_QUERIES_JSON: JSON.stringify(["q1", "q2", "q3"]),
    NEST_ADAPTER_INGEST_URL: "https://nest.invalid/api/v1/internal/adapters/ingest",
    ADAPTER_INGEST_TOKEN: "selftest-adapter-token",
    ...overrides,
  };
}

const OAUTH_TOKEN_OK = () =>
  jsonResponse({ access_token: "selftest-token", expires_in: 7200 });
const INGEST_OK = () => jsonResponse({ ok: true });

async function scenarioAuthFailedFast(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(textResponse("unauthorized", 401));
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(textResponse("should never reach Browse", 500));
  }, calls);
  try {
    const result = await runTick(baseEnv(), { tickBudgetMs: 5_000 });
    record(
      "auth_failed (401): exactly 1 token call, non-retryable",
      tokenCalls(calls) === 1,
      `tokenCalls=${tokenCalls(calls)}`,
    );
    record(
      "auth_failed (401): zero Browse calls (no thundering herd across 6 units)",
      browseCalls(calls) === 0,
      `browseCalls=${browseCalls(calls)}`,
    );
    record(
      "auth_failed (401): every marketplace classified auth_failed",
      result.marketplaceHealth.every((m) => m.errorClass === "auth_failed" && m.failureCount === 3),
      JSON.stringify(result.marketplaceHealth),
    );
    record(
      "auth_failed (401): tick completes, not deadline-incomplete",
      result.tickIncomplete === false,
      `tickIncomplete=${result.tickIncomplete}`,
    );
    const ingest = ingestCalls(calls);
    record("auth_failed (401): heartbeat POSTed to Nest", ingest.length >= 1, `ingest=${ingest.length}`);
    const firstBody = ingest[0]?.body ? JSON.parse(ingest[0].body) : null;
    record(
      "auth_failed (401): heartbeat carries a non-empty providerTickId",
      typeof firstBody?.providerTickId === "string" && firstBody.providerTickId.length > 0,
      `providerTickId=${firstBody?.providerTickId}`,
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioAuthTransientBounded(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(textResponse("server error", 500));
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(textResponse("should never reach Browse", 500));
  }, calls);
  try {
    const result = await runTick(baseEnv(), { tickBudgetMs: 10_000 });
    record(
      `auth transient (500x): token calls bounded at exactly DEFAULT_MAX_ATTEMPTS=${DEFAULT_MAX_ATTEMPTS} (nested-retry amplification would be ${DEFAULT_MAX_ATTEMPTS * DEFAULT_MAX_ATTEMPTS}+)`,
      tokenCalls(calls) === DEFAULT_MAX_ATTEMPTS,
      `tokenCalls=${tokenCalls(calls)}`,
    );
    record(
      "auth transient (500x): zero Browse calls",
      browseCalls(calls) === 0,
      `browseCalls=${browseCalls(calls)}`,
    );
    record(
      "auth transient (500x): every marketplace classified server_error",
      result.marketplaceHealth.every((m) => m.errorClass === "server_error"),
      JSON.stringify(result.marketplaceHealth),
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioBrowseFullOutage(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(textResponse("server error", 500));
  }, calls);
  try {
    const result = await runTick(baseEnv(), { tickBudgetMs: 10_000 });
    const units = 2 * 3; // EBAY_US,EBAY_GB x q1,q2,q3
    record(
      "Browse full outage: exactly ONE token call for the whole tick (preflight, not per-query)",
      tokenCalls(calls) === 1,
      `tokenCalls=${tokenCalls(calls)}`,
    );
    record(
      `Browse full outage: Browse calls == units*DEFAULT_MAX_ATTEMPTS = ${units * DEFAULT_MAX_ATTEMPTS} (bounded, no token re-entry)`,
      browseCalls(calls) === units * DEFAULT_MAX_ATTEMPTS,
      `browseCalls=${browseCalls(calls)}`,
    );
    record(
      "Browse full outage: every marketplace fully failed, server_error",
      result.marketplaceHealth.every((m) => m.failureCount === 3 && m.errorClass === "server_error"),
      JSON.stringify(result.marketplaceHealth),
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioMalformedBrowseJson(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(textResponse("{not-json", 200));
  }, calls);
  try {
    const result = await runTick(baseEnv(), { tickBudgetMs: 10_000 });
    const units = 2 * 3;
    record(
      "malformed Browse JSON: non-retryable, exactly 1 Browse attempt per unit",
      browseCalls(calls) === units,
      `browseCalls=${browseCalls(calls)}`,
    );
    record(
      "malformed Browse JSON: classified malformed_response",
      result.marketplaceHealth.every((m) => m.errorClass === "malformed_response"),
      JSON.stringify(result.marketplaceHealth),
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioPartialMarketplaceFailure(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url, init) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const marketplaceId = headers["X-EBAY-C-MARKETPLACE-ID"];
    if (marketplaceId === "EBAY_GB") return Promise.resolve(textResponse("server error", 500));
    return Promise.resolve(
      jsonResponse({
        itemSummaries: [
          {
            itemId: "1",
            title: "t",
            price: { value: "10.00", currency: "USD" },
            itemWebUrl: "https://ebay.example/1",
          },
        ],
      }),
    );
  }, calls);
  try {
    const result = await runTick(baseEnv(), { tickBudgetMs: 10_000 });
    const us = result.marketplaceHealth.find((m) => m.marketplaceId === "EBAY_US");
    const gb = result.marketplaceHealth.find((m) => m.marketplaceId === "EBAY_GB");
    record(
      "partial outage: healthy marketplace (EBAY_US) fully succeeds",
      us?.successCount === 3 && us?.failureCount === 0,
      JSON.stringify(us),
    );
    record(
      "partial outage: failing marketplace (EBAY_GB) fully fails, isolated",
      gb?.failureCount === 3 && gb?.successCount === 0,
      JSON.stringify(gb),
    );
    record("partial outage: tick still completes (not incomplete)", result.tickIncomplete === false, "");
  } finally {
    restoreFetch();
  }
}

async function scenarioTickDeadlineExceeded(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  const tickBudgetMs = 900;
  installFetch((url, init) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return hangingResponse(init?.signal);
  }, calls);
  const startedAtMs = Date.now();
  try {
    const result = await runTick(
      baseEnv({
        EBAY_MARKETPLACES: "EBAY_US,EBAY_GB",
        EBAY_SEARCH_QUERIES_JSON: JSON.stringify(["q1", "q2", "q3", "q4"]),
      }),
      { tickBudgetMs },
    );
    const elapsedMs = Date.now() - startedAtMs;
    const slackMs = 5_000; // generous CI/event-loop scheduling slack
    record(
      `tick deadline: whole tick exits inside budget+slack (elapsed=${elapsedMs}ms, budget=${tickBudgetMs}ms, slack=${slackMs}ms)`,
      elapsedMs <= tickBudgetMs + slackMs,
      `elapsedMs=${elapsedMs}`,
    );
    record(
      "tick deadline: explicit tickIncomplete=true evidence (never silently successful)",
      result.tickIncomplete === true,
      `tickIncomplete=${result.tickIncomplete}`,
    );
    record(
      "tick deadline: ok=false while incomplete (fail-closed, not vacuous success)",
      result.ok === false,
      `ok=${result.ok}`,
    );
    record(
      "tick deadline: at least one marketplace shows deadline_exceeded evidence",
      result.marketplaceHealth.some((m) => m.errorClass === "deadline_exceeded"),
      JSON.stringify(result.marketplaceHealth),
    );
    const ingest = ingestCalls(calls);
    const lastBody = ingest.length ? JSON.parse(ingest[ingest.length - 1].body ?? "{}") : null;
    record(
      "tick deadline: failure heartbeat still reaches Nest with tickIncomplete=true",
      ingest.length >= 1 && lastBody?.tickIncomplete === true,
      `ingest=${ingest.length} lastBody.tickIncomplete=${lastBody?.tickIncomplete}`,
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioRecoveryAfterOutage(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(
      jsonResponse({
        itemSummaries: [
          {
            itemId: "42",
            title: "recovered",
            price: { value: "5.00", currency: "USD" },
            itemWebUrl: "https://ebay.example/42",
          },
        ],
      }),
    );
  }, calls);
  try {
    const result = await runTick(baseEnv(), { tickBudgetMs: 10_000 });
    const units = 2 * 3;
    record(
      "recovery tick: zero errors, fully healthy",
      result.errors.length === 0 && result.tickIncomplete === false && result.ok === true,
      JSON.stringify({ errors: result.errors, tickIncomplete: result.tickIncomplete, ok: result.ok }),
    );
    record(
      "recovery tick: one token call, one successful Browse attempt per unit",
      tokenCalls(calls) === 1 && browseCalls(calls) === units,
      `tokenCalls=${tokenCalls(calls)} browseCalls=${browseCalls(calls)}`,
    );
    record(
      "recovery tick: listings collected for every unit",
      result.listings === units,
      `listings=${result.listings}`,
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioHeartbeatSameTickIdAcrossBatches(): Promise<void> {
  // §R1-A worker-side half of the contract: prove the SAME providerTickId is
  // sent on every ingest POST this tick produces (Nest-side dedup on that id
  // is proven separately by provider-health.selftest.ts).
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  const queries = Array.from({ length: 45 }, (_, i) => `q${i}`); // > batchSize(40) -> >=2 batches
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(
      jsonResponse({
        itemSummaries: [
          { itemId: "1", title: "t", price: { value: "1.00", currency: "USD" }, itemWebUrl: "https://x" },
        ],
      }),
    );
  }, calls);
  try {
    await runTick(
      baseEnv({ EBAY_MARKETPLACES: "EBAY_US", EBAY_SEARCH_QUERIES_JSON: JSON.stringify(queries) }),
      { tickBudgetMs: 15_000 },
    );
    const ingest = ingestCalls(calls);
    const ids = ingest.map((c) => (c.body ? JSON.parse(c.body).providerTickId : null));
    record(
      "multi-batch heartbeat: at least 2 ingest batches produced for 45 listings",
      ingest.length >= 2,
      `batches=${ingest.length}`,
    );
    record(
      "multi-batch heartbeat: every batch carries the SAME providerTickId",
      ids.every((id) => typeof id === "string" && id.length > 0 && id === ids[0]),
      `ids=${JSON.stringify(ids)}`,
    );
  } finally {
    restoreFetch();
  }
}

async function scenarioHttpTickEndpointSmoke(): Promise<void> {
  __resetTokenCacheForTests();
  const calls: Call[] = [];
  installFetch((url) => {
    if (url.includes(IDENTITY_BASE)) return Promise.resolve(OAUTH_TOKEN_OK());
    if (url.includes("/adapters/ingest")) return Promise.resolve(INGEST_OK());
    return Promise.resolve(jsonResponse({ itemSummaries: [] }));
  }, calls);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const workerModule = (await import("./index")).default;
    const res = await workerModule.fetch(
      new Request("https://worker.invalid/tick", {
        method: "POST",
        headers: { "x-adapter-token": "selftest-adapter-token" },
      }),
      baseEnv(),
    );
    const body = (await res.json()) as { ok: boolean };
    record("HTTP /tick smoke: 200 + ok:true via the real fetch() entrypoint", res.status === 200 && body.ok === true, JSON.stringify(body));
  } finally {
    restoreFetch();
  }
}

async function main(): Promise<void> {
  await scenarioAuthFailedFast();
  await scenarioAuthTransientBounded();
  await scenarioBrowseFullOutage();
  await scenarioMalformedBrowseJson();
  await scenarioPartialMarketplaceFailure();
  await scenarioTickDeadlineExceeded();
  await scenarioRecoveryAfterOutage();
  await scenarioHeartbeatSameTickIdAcrossBatches();
  await scenarioHttpTickEndpointSmoke();

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    `[fault-injection.selftest] ALL PASS — ${results.length} checks (nested-retry bound, tick deadline bound, heartbeat idempotency contract, partial/full outage isolation, recovery) · MIN_CALL_BUDGET_MS=${MIN_CALL_BUDGET_MS}`,
  );
}

main().catch((e) => {
  restoreFetch();
  // eslint-disable-next-line no-console
  console.error("[fault-injection.selftest] FATAL", e);
  process.exit(1);
});
