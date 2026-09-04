/**
 * verify:ebay-resilience — PTF-00C P0-C/P0-D · §7/§8/§9/§10
 * timeout/bounded retry/backoff+jitter/error classification (retry-policy.cjs)
 * durable CLOSED/OPEN circuit + HEALTHY/DEGRADED/STALE/BLOCKED (provider-health.cjs)
 * always-heartbeat + per-marketplace isolation + nativeAmount contract (worker source)
 * "eBay down != Peotteok down": one full-outage tick must never crash/discard others.
 *
 * PTF-00C-R1 closure additions:
 * - §2 heartbeat idempotency (provider_tick_ledger + providerTickId thread-through)
 * - §3 nested retry elimination (single per-tick token preflight)
 * - §4/§6 deterministic tick runtime budget (TICK_BUDGET_MS/deadline)
 * - §5 circuit-breaker honesty (upstreamGating always "NONE" this wave)
 * - §7 REAL runtime fault-injection selftests (mocked fetch / fake DB, not
 *   static regex) for both the worker tick logic and Nest's durable dedup.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "workers/ebay-adapter/src/retry-policy.cjs",
  "workers/ebay-adapter/src/retry-policy.d.cts",
  "workers/ebay-adapter/src/browse-api.ts",
  "workers/ebay-adapter/src/index.ts",
  "workers/ebay-adapter/src/constants.ts",
  "workers/ebay-adapter/src/fault-injection.selftest.ts",
  "workers/ebay-adapter/tsconfig.selftest.json",
  "services/market-intelligence/src/provider-health.cjs",
  "services/api-nest/src/adapters/provider-health.service.ts",
  "services/api-nest/src/adapters/provider-health.selftest.ts",
  "services/api-nest/src/adapters/adapters.admin.service.ts",
  "supabase/migrations/20260814130100_ptf00c_provider_runtime_health.sql",
  "supabase/migrations/20260814140000_ptf00c_r1_provider_tick_ledger.sql",
];
for (const f of files) mustExist(f);
if (fails.length) {
  console.error("[verify:ebay-resilience] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const rp = require(path.join(root, "workers/ebay-adapter/src/retry-policy.cjs"));
const ph = require(path.join(root, "services/market-intelligence/src/provider-health.cjs"));

// --- §7 error classification ---
const classCases = [
  [429, "rate_limited"],
  [500, "server_error"],
  [503, "server_error"],
  [401, "auth_failed"],
  [403, "auth_failed"],
  [404, "client_error"],
  [400, "client_error"],
];
for (const [status, want] of classCases) {
  const got = rp.classifyHttpStatus(status);
  if (got !== want) fails.push(`classifyHttpStatus(${status}) want ${want} got ${got}`);
}
{
  const abortErr = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
  if (rp.classifyThrown(abortErr) !== "timeout") {
    fails.push("classifyThrown(AbortError) must be timeout");
  }
  const jsonErr = new SyntaxError("Unexpected token in JSON");
  if (rp.classifyThrown(jsonErr) !== "malformed_response") {
    fails.push("classifyThrown(SyntaxError) must be malformed_response");
  }
  const netErr = new Error("fetch failed: ECONNRESET");
  if (rp.classifyThrown(netErr) !== "network_error") {
    fails.push("classifyThrown(network) must be network_error");
  }
}

// --- §7 retryable vs non-retryable ---
const retryableTrue = ["rate_limited", "server_error", "timeout", "network_error"];
const retryableFalse = ["auth_failed", "client_error", "malformed_response", "unknown"];
for (const c of retryableTrue) {
  if (!rp.isRetryableErrorClass(c)) fails.push(`${c} must be retryable`);
}
for (const c of retryableFalse) {
  if (rp.isRetryableErrorClass(c)) fails.push(`${c} must NOT be retryable`);
}

// --- §7 bounded retry — never infinite ---
{
  const maxAttempts = rp.DEFAULT_MAX_ATTEMPTS;
  if (!(maxAttempts >= 2 && maxAttempts <= 6)) {
    fails.push(`DEFAULT_MAX_ATTEMPTS ${maxAttempts} out of a sane bounded range`);
  }
  if (!rp.shouldRetry({ attemptIndex: 0, errorClass: "server_error", maxAttempts: 3 })) {
    fails.push("shouldRetry must allow retry before maxAttempts");
  }
  if (rp.shouldRetry({ attemptIndex: 2, errorClass: "server_error", maxAttempts: 3 })) {
    fails.push("shouldRetry must stop at maxAttempts (no infinite retry)");
  }
  if (rp.shouldRetry({ attemptIndex: 0, errorClass: "auth_failed", maxAttempts: 3 })) {
    fails.push("shouldRetry must never retry auth_failed");
  }
}

// --- §7 exponential backoff bounded + full jitter in range ---
{
  const d0 = rp.backoffDelayMs(0);
  const d1 = rp.backoffDelayMs(1);
  const d2 = rp.backoffDelayMs(2);
  if (!(d1 >= d0 && d2 >= d1)) fails.push("backoffDelayMs must be non-decreasing with attemptIndex");
  const dCap = rp.backoffDelayMs(20);
  if (dCap > rp.DEFAULT_MAX_DELAY_MS) fails.push("backoffDelayMs must be bounded by DEFAULT_MAX_DELAY_MS");
  const jittered = rp.applyFullJitter(1000, () => 0.5);
  if (jittered !== 500) fails.push(`applyFullJitter(1000, 0.5) want 500 got ${jittered}`);
  const jitteredMax = rp.applyFullJitter(1000, () => 0.999999);
  if (!(jitteredMax < 1000)) fails.push("applyFullJitter must stay strictly below delayMs");
}

// --- §10 circuit breaker: CLOSED -> OPEN -> (cooldown) -> probe -> CLOSED/OPEN ---
{
  const t0 = 1_000_000;
  let s = ph.initialCircuitState();
  for (let i = 0; i < ph.DEFAULT_FAILURE_THRESHOLD; i += 1) {
    s = ph.nextCircuitState({ prev: s, tickSuccess: false, nowMs: t0 + i * 1000 });
  }
  if (s.state !== "OPEN") fails.push(`circuit must OPEN after ${ph.DEFAULT_FAILURE_THRESHOLD} consecutive failures`);

  const midCooldown = ph.nextCircuitState({
    prev: s,
    tickSuccess: true,
    nowMs: t0 + ph.DEFAULT_FAILURE_THRESHOLD * 1000 + 1000,
  });
  if (midCooldown.state !== "OPEN") {
    fails.push("circuit must stay OPEN during cooldown even if that tick succeeded");
  }

  const afterCooldownSuccess = ph.nextCircuitState({
    prev: s,
    tickSuccess: true,
    nowMs: s.openedAtMs + ph.DEFAULT_COOLDOWN_MS + 1,
  });
  if (afterCooldownSuccess.state !== "CLOSED" || afterCooldownSuccess.consecutiveFailures !== 0) {
    fails.push("successful probe after cooldown must recover to CLOSED (reset failures)");
  }

  const afterCooldownFailure = ph.nextCircuitState({
    prev: s,
    tickSuccess: false,
    nowMs: s.openedAtMs + ph.DEFAULT_COOLDOWN_MS + 1,
  });
  if (afterCooldownFailure.state !== "OPEN") {
    fails.push("failed probe after cooldown must reopen (stay OPEN), not silently heal");
  }

  const display = ph.deriveDisplayCircuitState({
    state: "OPEN",
    openedAtMs: t0,
    nowMs: t0 + ph.DEFAULT_COOLDOWN_MS + 1,
  });
  if (display !== "HALF_OPEN") fails.push("post-cooldown OPEN must display as HALF_OPEN (probe pending)");
}

// --- §9 health status derivation — partial failure never renders HEALTHY ---
{
  const now = 2_000_000;
  if (ph.deriveHealthStatus({ displayCircuitState: "OPEN", lastSuccessAtMs: now, nowMs: now }) !== "BLOCKED") {
    fails.push("OPEN must derive BLOCKED health");
  }
  if (
    ph.deriveHealthStatus({ displayCircuitState: "CLOSED", lastSuccessAtMs: null, nowMs: now }) !== "STALE"
  ) {
    fails.push("no evidence yet must derive STALE, not HEALTHY/unknown-as-green");
  }
  if (
    ph.deriveHealthStatus({
      displayCircuitState: "CLOSED",
      lastSuccessAtMs: now - ph.DEFAULT_STALE_AFTER_MS - 1,
      nowMs: now,
    }) !== "STALE"
  ) {
    fails.push("evidence older than DEFAULT_STALE_AFTER_MS must derive STALE");
  }
  if (
    ph.deriveHealthStatus({
      displayCircuitState: "CLOSED",
      lastSuccessAtMs: now,
      nowMs: now,
      lastTickFailureCount: 1,
    }) !== "DEGRADED"
  ) {
    fails.push("§8 partial failure (success AND failure this tick) must derive DEGRADED, never HEALTHY");
  }
  if (
    ph.deriveHealthStatus({ displayCircuitState: "HALF_OPEN", lastSuccessAtMs: now, nowMs: now }) !==
    "DEGRADED"
  ) {
    fails.push("HALF_OPEN (probing) must derive DEGRADED");
  }
  const tints = ["HEALTHY", "DEGRADED", "STALE", "BLOCKED", undefined].map(ph.healthStatusToLegacyTint);
  if (tints.join(",") !== "green,yellow,red,red,unknown") {
    fails.push(`legacy tint mapping drifted: ${tints.join(",")}`);
  }
  if (ph.worstTint(["green", "yellow", "green"]) !== "yellow") {
    fails.push("worstTint must pick the worst (yellow over green)");
  }
  if (ph.worstTint(["green", "red", "yellow"]) !== "red") {
    fails.push("worstTint must pick red over yellow/green");
  }
}

// --- §7/§8/§10 structural checks on the worker source ---
const browseApi = read("workers/ebay-adapter/src/browse-api.ts");
for (const needle of [
  "AbortController",
  "retry-policy.cjs",
  "withRetry",
  "classifyHttpStatus",
  "classifyThrown",
  "errorClass",
]) {
  if (!browseApi.includes(needle)) fails.push(`browse-api.ts missing ${needle}`);
}

const workerIdx = read("workers/ebay-adapter/src/index.ts");
if (/ingestUrl\s*&&\s*\(\s*listings\.length > 0 \|\| dryRun\s*\)/.test(workerIdx)) {
  fails.push(
    "P0-D regression: ebay-adapter still gates ingest POST on listings.length>0||dryRun (zero-listing outage would send nothing)",
  );
}
if (!workerIdx.includes("marketplaceHealth")) {
  fails.push("ebay-adapter index.ts must send marketplaceHealth heartbeat evidence");
}
if (!/nativeAmount:\s*item\.priceValue/.test(workerIdx)) {
  fails.push("P0-A regression: ebay-adapter must send nativeAmount (never priceUsdt) from item.priceValue");
}
if (/priceUsdt:\s*item\.priceValue/.test(workerIdx)) {
  fails.push("P0-A regression: ebay-adapter must NOT label the native reading priceUsdt");
}
if (!/catch\s*\(e\)\s*\{/.test(workerIdx) || !/tally\.failureCount \+= 1/.test(workerIdx)) {
  fails.push("§7 per-marketplace/query isolation try/catch missing in runTick loop");
}

const providerHealthSvc = read("services/api-nest/src/adapters/provider-health.service.ts");
if (!providerHealthSvc.includes("provider_runtime_health")) {
  fails.push("ProviderHealthService must read/write provider_runtime_health");
}

const adaptersSvc = read("services/api-nest/src/adapters/adapters.admin.service.ts");
for (const needle of ["recordEbayProviderHeartbeat", "recordFxIngest", "worstTint"]) {
  if (!adaptersSvc.includes(needle)) fails.push(`adapters.admin.service missing ${needle}`);
}
if (!adaptersSvc.includes("body.providerTickId")) {
  fails.push(
    "PTF-00C-R1 §2 regression: adapters.admin.service must thread body.providerTickId into recordTick() calls",
  );
}

// --- PTF-00C-R1 §2 heartbeat idempotency structural checks ---
const constantsTs = read("workers/ebay-adapter/src/constants.ts");
for (const needle of ["TICK_BUDGET_MS", "MIN_CALL_BUDGET_MS", "TICK_CONCURRENCY"]) {
  if (!constantsTs.includes(needle)) fails.push(`constants.ts missing ${needle}`);
}
if (!workerIdx.includes("providerTickId")) {
  fails.push("PTF-00C-R1 §2 regression: ebay-adapter index.ts must generate/send providerTickId");
}
if (!/const providerTickId = randomTickId\(\);/.test(workerIdx)) {
  fails.push("PTF-00C-R1 §2 regression: providerTickId must be generated ONCE per runTick, not per batch");
}
if (!workerIdx.includes("tickIncomplete")) {
  fails.push("PTF-00C-R1 §4/§6 regression: ebay-adapter index.ts must surface explicit tickIncomplete evidence");
}
if (!providerHealthSvc.includes("provider_tick_ledger")) {
  fails.push("PTF-00C-R1 §2 regression: ProviderHealthService must claim provider_tick_ledger before applying a tick");
}
if (!providerHealthSvc.includes("upstreamGating")) {
  fails.push("PTF-00C-R1 §5 regression: ProviderHealthService must expose the honest upstreamGating=NONE signal");
}

// --- PTF-00C-R1 §3 nested-retry-amplification regression guard ---
// searchOnce (the Browse fetch) must never itself acquire/retry a token —
// that would reintroduce the outer(searchItemSummary) x inner(getAppToken)
// multiplication this closure removed. getAppToken must be called from
// index.ts's runTick exactly once (the preflight), never from browse-api.ts
// itself anymore.
{
  const searchOnceBody = (browseApi.match(/async function searchOnce\([\s\S]*?\n\}/) || [""])[0];
  if (!searchOnceBody) {
    fails.push("browse-api.ts: could not locate searchOnce() body for the nested-retry regression guard");
  } else if (/getAppToken\(/.test(searchOnceBody)) {
    fails.push(
      "PTF-00C-R1 §3 regression: searchOnce() must never call getAppToken() — token retry must not nest inside the per-query Browse retry",
    );
  }
  if (browseApi.includes("clientId") && /async function searchOnce/.test(browseApi)) {
    // searchOnce/searchItemSummary must take an already-resolved token, not
    // raw credentials (which is what let it call getAppToken itself before).
    const searchItemSummaryBody = (
      browseApi.match(/export async function searchItemSummary\([\s\S]*?\n\}/) || [""]
    )[0];
    if (/clientId|clientSecret/.test(searchItemSummaryBody)) {
      fails.push(
        "PTF-00C-R1 §3 regression: searchItemSummary() must take a resolved `token`, not clientId/clientSecret",
      );
    }
  }
  if (!browseApi.includes("deadlineAtMs")) {
    fails.push("PTF-00C-R1 §4/§6 regression: browse-api.ts must thread deadlineAtMs through withRetry/fetchWithTimeout");
  }
}

// --- §11 user critical-path isolation: Nest must never call OUT to eBay ---
// (ebay-adapter is a standalone Cloudflare Worker that PUSHes into Nest via
// /adapters/ingest — Nest never fetches api.ebay.com itself, so auth/home/
// wallet/ledger/settlement/withdrawal/profile cannot block on eBay latency.)
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
}
{
  const apiNestSrc = path.join(root, "services/api-nest/src");
  const allTs = [];
  walk(apiNestSrc, allTs);
  const offenders = [];
  for (const file of allTs) {
    const code = stripComments(fs.readFileSync(file, "utf8"));
    if (/\bapi\.ebay\.com\b|\bebay\.com\/buy\/browse\b/i.test(code)) {
      offenders.push(path.relative(root, file));
    }
  }
  if (offenders.length) {
    fails.push(
      `§11 violation: services/api-nest must never call out to eBay directly — found in ${offenders.join(", ")}`,
    );
  }
}

// --- §16 settled money independence: circuit/health code must never touch ledger/settlement ---
// (comments stripped first — this file's own docstrings legitimately name
// settlement_rule.cjs/ledger concepts while explaining the invariant)
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
for (const rel of [
  "services/market-intelligence/src/provider-health.cjs",
  "services/api-nest/src/adapters/provider-health.service.ts",
]) {
  const code = stripComments(read(rel));
  if (/ledger_entries|ledger_journals|\bsettlement\b|trade_executions/i.test(code)) {
    fails.push(`${rel} must stay money-independent (no ledger/settlement/trade_executions reference)`);
  }
}

// --- package wiring ---
// NOTE: tooling/verify/CATALOG.md documentation update for this id is a
// known, tracked gap (tool-side edit failure on that specific file this
// session, confirmed content-independent — see PTF-00C report §19/§30).
// It carries zero functional/CI risk: nothing parses CATALOG.md at runtime.
const pkg = read("package.json");
if (pkg.indexOf('"verify:ebay-resilience"') === -1) {
  fails.push("package.json missing verify:ebay-resilience script");
}

// --- PTF-00C-R1 §7 REAL runtime fault-injection selftests ---
// Both run the ACTUAL compiled TypeScript control flow (mocked
// fetch / fake in-memory DB), never a static regex-only claim.
if (fails.length === 0) {
  const tscBin = require.resolve("typescript/bin/tsc");
  const workerBuild = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "workers/ebay-adapter/tsconfig.selftest.json")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(workerBuild.stdout || "");
  process.stderr.write(workerBuild.stderr || "");
  if (workerBuild.status !== 0) {
    fails.push(
      "workers/ebay-adapter tsconfig.selftest.json build failed — cannot run fault-injection.selftest",
    );
  } else {
    const distSelftest = path.join(root, "workers/ebay-adapter/dist-selftest");
    try {
      fs.copyFileSync(
        path.join(root, "workers/ebay-adapter/src/retry-policy.cjs"),
        path.join(distSelftest, "retry-policy.cjs"),
      );
    } catch (e) {
      fails.push(`could not stage retry-policy.cjs into dist-selftest: ${e.message}`);
    }
    const selftestJs = path.join(distSelftest, "fault-injection.selftest.js");
    if (fails.length === 0) {
      if (!fs.existsSync(selftestJs)) {
        fails.push(`missing compiled selftest: ${selftestJs}`);
      } else {
        const run = spawnSync(process.execPath, [selftestJs], {
          cwd: root,
          encoding: "utf8",
          timeout: 60_000,
        });
        process.stdout.write(run.stdout || "");
        process.stderr.write(run.stderr || "");
        if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
          fails.push(
            "fault-injection.selftest did not report ALL PASS (worker tick fault-injection failed — see stdout above)",
          );
        }
      }
    }
  }
}

if (fails.length === 0) {
  const tscBin = require.resolve("typescript/bin/tsc");
  const nestBuild = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(nestBuild.stdout || "");
  process.stderr.write(nestBuild.stderr || "");
  if (nestBuild.status !== 0) {
    fails.push("services/api-nest tsc build failed — cannot run provider-health.selftest");
  } else {
    const selftestJs = path.join(
      root,
      "services/api-nest/dist/adapters/provider-health.selftest.js",
    );
    if (!fs.existsSync(selftestJs)) {
      fails.push(`missing compiled selftest: ${selftestJs}`);
    } else {
      const run = spawnSync(process.execPath, [selftestJs], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      process.stdout.write(run.stdout || "");
      process.stderr.write(run.stderr || "");
      if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
        fails.push(
          "provider-health.selftest did not report ALL PASS (heartbeat idempotency contract failed — see stdout above)",
        );
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:ebay-resilience] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:ebay-resilience] PASS (timeout/bounded-retry/backoff+jitter · CLOSED/OPEN/HALF_OPEN · HEALTHY/DEGRADED/STALE/BLOCKED · always-heartbeat · nativeAmount contract · money-independent · PTF-00C-R1: tick idempotency ledger · nested-retry eliminated · tick deadline bounded · circuit honesty · real fault-injection selftests)",
);
