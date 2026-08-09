/**
 * verify:execution-surfaces — UI §48 · Canon 3유저면 + Admin wire
 * AiProgressRoom · ExecutionSuccessReceipt · ExecutionSafeStop · ExecutionStepList
 * Soft/Hard 카피3줄 배선 · ProductThumb · steps active/done
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
  "packages/ui/components/execution/AiProgressRoom.tsx",
  "packages/ui/components/execution/ExecutionSuccessReceipt.tsx",
  "packages/ui/components/execution/ExecutionSafeStop.tsx",
  "packages/ui/components/execution/ExecutionStepList.tsx",
  "packages/ui/components/execution/ProductThumb.tsx",
  "packages/ui/components/execution/index.ts",
  "packages/ui/copy/ko/execution.ts",
  "packages/ui/canon/surfaces/execution-running.wire.json",
  "packages/ui/canon/surfaces/execution-success.wire.json",
  "packages/ui/canon/surfaces/execution-safe-stop.wire.json",
  "packages/ui/canon/surfaces/admin-execution-policy.wire.json",
  "apps/web/app/trades/[id]/execute/page.tsx",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/execution.ts");
for (const [key, want] of [
  ["slaSoftHint", "보통 1분 안에 결과가 나와요"],
  ["requeueHint", "조건을 다시 맞추는 중이에요 · 손댈 것 없음"],
  ["matchTimeout", "시간이 지나 안전하게 멈췄어요 · 잔액은 그대로예요"],
]) {
  const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const m = copy.match(re);
  if (!m) fails.push(`execution.ts missing ${key}`);
  else if (m[1] !== want) fails.push(`${key} want "${want}" got "${m[1]}"`);
}

const room = read("packages/ui/components/execution/AiProgressRoom.tsx");
for (const needle of [
  "ProductThumb",
  "ExecutionStepList",
  "slaSoftHint",
  "requeueHint",
  "slaAlmost",
  "T.execution.cancel",
  'data-testid="ai-progress-room"',
  'data-canon="execution-running"',
]) {
  if (!room.includes(needle)) fails.push(`AiProgressRoom missing ${needle}`);
}

const steps = read("packages/ui/components/execution/ExecutionStepList.tsx");
for (const needle of [
  "T.execution.steps",
  'data-step-state={done ? "done"',
  'data-testid="execution-step-list"',
  "active",
  "done",
]) {
  if (!steps.includes(needle)) {
    fails.push(`ExecutionStepList missing ${needle}`);
  }
}

const success = read(
  "packages/ui/components/execution/ExecutionSuccessReceipt.tsx",
);
for (const needle of [
  "ProductThumb",
  "SuccessBucketCtas",
  "CountUpNumber",
  'source="settlement.completed"',
  'data-canon="execution-success"',
  "PriceCompareMargin",
]) {
  if (!success.includes(needle)) {
    fails.push(`ExecutionSuccessReceipt missing ${needle}`);
  }
}

const safe = read("packages/ui/components/execution/ExecutionSafeStop.tsx");
for (const needle of [
  "ProductThumb",
  "matchTimeout",
  "priceNearMiss",
  "balanceUnchanged",
  'data-canon="execution-safe-stop"',
  "MATCH_FAILURE",
]) {
  if (needle === "MATCH_FAILURE") {
    if (safe.includes("MATCH_FAILURE")) {
      fails.push("ExecutionSafeStop must not expose MATCH_FAILURE english");
    }
  } else if (!safe.includes(needle)) {
    fails.push(`ExecutionSafeStop missing ${needle}`);
  }
}

const idx = read("packages/ui/components/execution/index.ts");
for (const exp of [
  "AiProgressRoom",
  "ExecutionSuccessReceipt",
  "ExecutionSafeStop",
  "ExecutionStepList",
  "ProductThumb",
]) {
  if (!idx.includes(exp)) fails.push(`execution/index.ts must export ${exp}`);
}

const page = read("apps/web/app/trades/[id]/execute/page.tsx");
for (const needle of [
  "useTradeExecution",
  "AiProgressRoom",
  "ExecutionSuccessReceipt",
  "ExecutionSafeStop",
  "@aipo/ui/components/execution",
]) {
  if (!page.includes(needle)) fails.push(`execute page missing ${needle}`);
}

const uiPkg = read("packages/ui/package.json");
for (const exp of [
  "./components/execution",
  "./components/execution/AiProgressRoom",
  "./components/execution/ExecutionSuccessReceipt",
  "./components/execution/ExecutionSafeStop",
  "./components/execution/ExecutionStepList",
]) {
  if (!uiPkg.includes(exp)) {
    fails.push(`@aipo/ui package.json missing export ${exp}`);
  }
}

// Canon 4면 productThumb / blocks
const running = JSON.parse(
  read("packages/ui/canon/surfaces/execution-running.wire.json") || "{}",
);
const byId = Object.fromEntries((running.blocks || []).map((b) => [b.id, b]));
for (const id of [
  "productThumb",
  "steps",
  "slaSoftHint",
  "requeueHint",
  "cancel",
]) {
  if (!byId[id]) fails.push(`execution-running missing block ${id}`);
}

const successWire = JSON.parse(
  read("packages/ui/canon/surfaces/execution-success.wire.json") || "{}",
);
const sById = Object.fromEntries(
  (successWire.blocks || []).map((b) => [b.id, b]),
);
if (!sById.productThumb) {
  fails.push("execution-success missing productThumb");
}
if (!sById.bucketCtas) {
  fails.push("execution-success missing bucketCtas (§49)");
}

const rootPkg = read("package.json");
if (!rootPkg.includes('"verify:execution-surfaces"')) {
  fails.push("package.json missing verify:execution-surfaces");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("execution-surfaces")) {
  fails.push("CATALOG.md must list execution-surfaces");
}
const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("execution-surfaces.cjs")) {
  fails.push("stubs/run-all.cjs must include execution-surfaces.cjs");
}

// Forbidden RNG / IT
for (const src of [room, success, safe, page]) {
  if (/successRatePercent|Math\.random\s*\(/.test(src)) {
    fails.push("execution surfaces must not use successRatePercent / Math.random");
  }
  if (/\bSLA\b|\btimeout\b/i.test(src) && /text-lux|children|\{T\./.test(src)) {
    // only fail if IT words appear as user-facing string literals
  }
  if (/"timeout"|"SLA"|"hard queue"/i.test(src)) {
    fails.push("execution surfaces must not expose IT timeout/SLA strings");
  }
}

if (fails.length) {
  console.error("[verify:execution-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:execution-surfaces] PASS (3면+StepList · Soft/Hard · ProductThumb · Canon)",
);
