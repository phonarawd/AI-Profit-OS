/**
 * verify:trade-execution-hook — PART4 useTradeExecution boundary
 * Phase0 polling POST …/execute-tick · Phase1+ SSE swap inside hook only
 * UI §29.6 / §30 · Engine §0.9.2
 */
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
  "packages/sdk/src/execution-stream/useTradeExecution.ts",
  "packages/sdk/src/execution-stream/polling-transport.ts",
  "packages/sdk/src/execution-stream/sse-transport.ts",
  "packages/sdk/src/execution-stream/create-transport.ts",
  "packages/sdk/src/execution-stream/transport.ts",
  "packages/sdk/src/execution-stream/types.ts",
  "packages/sdk/src/execution-stream/index.ts",
  "packages/sdk/src/device-tier.ts",
];
for (const f of files) mustExist(f);

const hook = read("packages/sdk/src/execution-stream/useTradeExecution.ts");
const polling = read("packages/sdk/src/execution-stream/polling-transport.ts");
const sse = read("packages/sdk/src/execution-stream/sse-transport.ts");
const factory = read("packages/sdk/src/execution-stream/create-transport.ts");
const transport = read("packages/sdk/src/execution-stream/transport.ts");
const types = read("packages/sdk/src/execution-stream/types.ts");
const tier = read("packages/sdk/src/device-tier.ts");
const sdkPkg = read("packages/sdk/package.json");
const sdkIdx = read("packages/sdk/src/index.ts");
const page = read("apps/web/app/trades/[id]/execute/page.tsx");
const rootPkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const stubs = read("tooling/verify/stubs/run-all.cjs");

// --- public API ---
if (!hook.includes("export function useTradeExecution")) {
  fails.push("must export useTradeExecution");
}
if (!hook.includes("createExecutionTransport")) {
  fails.push("hook must use createExecutionTransport (channel boundary)");
}
if (!hook.includes("tierBatchMs") || !hook.includes("executionTickMs")) {
  fails.push("hook must poll at StreamPolicy executionTickMs");
}
if (!hook.includes("DEFAULT_EXECUTION_TRANSPORT")) {
  fails.push("hook must default via DEFAULT_EXECUTION_TRANSPORT");
}

// --- Phase0 polling ---
if (!polling.includes("execute-tick")) {
  fails.push("polling transport must POST …/execute-tick");
}
if (!polling.includes('method: "POST"') && !polling.includes("method: 'POST'")) {
  fails.push("polling transport must use POST");
}
if (!polling.includes("Authorization")) {
  fails.push("polling transport must send Bearer token");
}
if (!polling.includes("isTerminalExecutionStatus")) {
  fails.push("polling must stop on terminal status");
}

// --- transport boundary ---
if (!transport.includes('"polling"') || !transport.includes('"sse"')) {
  fails.push("transport kinds must include polling|sse");
}
if (!transport.includes("DEFAULT_EXECUTION_TRANSPORT")) {
  fails.push("missing DEFAULT_EXECUTION_TRANSPORT");
}
if (!factory.includes("createPollingTransport") || !factory.includes("createSseTransport")) {
  fails.push("factory must select polling vs sse");
}
if (!sse.includes("PHASE1_EXECUTION_SSE_PATH") || !sse.includes("EventSource")) {
  fails.push("sse-transport must document Phase1 EventSource swap point");
}

// --- anti-fake (strip block/line comments before scanning) ---
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}
const hookCode = stripComments(hook);
const pollingCode = stripComments(polling);
for (const [label, src] of [
  ["useTradeExecution", hookCode],
  ["polling-transport", pollingCode],
]) {
  if (src.includes("Math.random")) {
    fails.push(`${label} must not use Math.random`);
  }
  if (/successRatePercent/.test(src)) {
    fails.push(`${label} must not reference successRatePercent`);
  }
}

// --- Phase0 must not assume Phase1 stream package ---
if (
  /from\s+["'][^"']*realtime-service/.test(hookCode) ||
  /from\s+["'][^"']*realtime-service/.test(pollingCode) ||
  /require\s*\(\s*["'][^"']*realtime-service/.test(hookCode) ||
  /require\s*\(\s*["'][^"']*realtime-service/.test(pollingCode)
) {
  fails.push("Phase0 hook/polling must not import realtime-service");
}
if (/new\s+EventSource/.test(hookCode) || /new\s+EventSource/.test(pollingCode)) {
  fails.push("Phase0 active path must not construct EventSource");
}

// --- StreamPolicy band ---
if (!tier.includes("executionTickMs")) {
  fails.push("tierBatchMs must expose executionTickMs (S/A/B)");
}

// --- types vs schema statuses ---
for (const st of [
  "running",
  "requeue",
  "success",
  "safe_stop",
  "cancelled",
  "failed",
]) {
  if (!types.includes(`"${st}"`)) {
    fails.push(`types missing status ${st}`);
  }
}
for (const code of ["MATCH_SUCCESS", "REQUEUE", "MATCH_TIMEOUT"]) {
  if (!types.includes(`"${code}"`)) {
    fails.push(`types missing resultCode ${code}`);
  }
}

// --- package exports ---
for (const exp of [
  "./execution-stream",
  "./execution-stream/useTradeExecution",
]) {
  if (!sdkPkg.includes(exp)) {
    fails.push(`@aipo/sdk package.json missing export ${exp}`);
  }
}
if (!sdkIdx.includes("useTradeExecution")) {
  fails.push("packages/sdk/src/index.ts must re-export useTradeExecution");
}
if (!sdkPkg.includes('"react"')) {
  fails.push("@aipo/sdk must declare react peerDependency");
}

// --- page wiring (Consumer skeleton = SDK only) ---
const { pageIsSkeleton } = require("./lib/greenfield-consumer.cjs");
if (!pageIsSkeleton("apps/web/app/trades/[id]/execute/page.tsx")) {
  if (
    !page.includes("useTradeExecution") ||
    !page.includes("@aipo/sdk/execution-stream")
  ) {
    fails.push("execute page must wire useTradeExecution from @aipo/sdk/execution-stream");
  }
  if (!page.includes("data-execution-transport")) {
    fails.push("execute page must expose data-execution-transport");
  }
}

// --- gate wiring ---
if (!rootPkg.includes('"verify:trade-execution-hook"')) {
  fails.push("root package.json missing verify:trade-execution-hook script");
}
if (!catalog.includes("trade-execution-hook")) {
  fails.push("CATALOG.md must list trade-execution-hook");
}
if (!stubs.includes("trade-execution-hook.cjs")) {
  fails.push("stubs/run-all.cjs must include trade-execution-hook.cjs");
}

if (fails.length) {
  console.error("[verify:trade-execution-hook] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trade-execution-hook] PASS (polling-now · SSE-later boundary · StreamPolicy · execute page)",
);
