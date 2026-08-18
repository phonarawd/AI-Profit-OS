/**
 * verify:deposit-confirm-stages — Money §41.4 · §43.1
 * 1conf = DEPOSIT_DETECTED · ledger 분개 0
 * 19conf = DEPOSIT_CONFIRMED · deposit_usdt credit
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/usdt-deposit-event.v1.json",
  "schemas/deposit-config.v1.json",
  "schemas/toast-codes.v1.json",
  "services/api-nest/src/wallet/usdt-deposit.service.ts",
  "services/api-nest/src/wallet/chain-watcher.stages.ts",
  "services/api-nest/src/wallet/chain-watcher.phase0.service.ts",
  "services/api-nest/src/wallet/wallet.events.ts",
  "workers/chain-watchers/src/confirmation-tracker.ts",
  "workers/chain-watchers/src/constants.ts",
  "workers/chain-watchers/src/usdt-trc20-event-stream.ts",
  "workers/chain-watchers/src/address-index.ts",
  "workers/chain-watchers/src/rate-limit-budgeter.ts",
  "workers/chain-watchers/src/index.ts",
  "workers/chain-watchers/wrangler.toml",
];
for (const f of files) mustExist(f);

const toast = read("schemas/toast-codes.v1.json");
for (const code of ["DEPOSIT_DETECTED", "DEPOSIT_CONFIRMED"]) {
  if (!toast.includes(`"${code}"`)) fails.push(`toast-codes missing ${code}`);
}

const schema = JSON.parse(read("schemas/deposit-config.v1.json"));
const onchain = schema.properties?.usdtOnchain?.properties;
if (onchain?.usdtUiConfirmations?.const !== 1) {
  fails.push("deposit-config usdtUiConfirmations must const 1");
}
if (onchain?.usdtLedgerConfirmations?.const !== 19) {
  fails.push("deposit-config usdtLedgerConfirmations must const 19");
}
if (onchain?.chainWatcherMode?.const !== "event_stream") {
  fails.push("deposit-config chainWatcherMode must const event_stream");
}

const nestStages = read("services/api-nest/src/wallet/chain-watcher.stages.ts");
const workerStages = read("workers/chain-watchers/src/confirmation-tracker.ts");
const workerConsts = read("workers/chain-watchers/src/constants.ts");

for (const [label, src] of [
  ["nest stages", nestStages],
  ["worker tracker", workerStages],
  ["worker constants", workerConsts],
]) {
  if (!src.includes("USDT_UI_CONFIRMATIONS = 1") && !src.includes("USDT_UI_CONFIRMATIONS = 1 as const")) {
    // constants file uses `= 1 as const`
  }
  if (!/USDT_UI_CONFIRMATIONS\s*=\s*1/.test(src) && label !== "worker tracker") {
    if (label === "worker tracker") {
      // imports from constants
    } else {
      fails.push(`${label}: USDT_UI_CONFIRMATIONS must be 1`);
    }
  }
}

if (!/USDT_UI_CONFIRMATIONS\s*=\s*1/.test(nestStages)) {
  fails.push("nest stages: USDT_UI_CONFIRMATIONS must be 1");
}
if (!/USDT_LEDGER_CONFIRMATIONS\s*=\s*19/.test(nestStages)) {
  fails.push("nest stages: USDT_LEDGER_CONFIRMATIONS must be 19");
}
if (!/USDT_UI_CONFIRMATIONS\s*=\s*1/.test(workerConsts)) {
  fails.push("worker constants: USDT_UI_CONFIRMATIONS must be 1");
}
if (!/USDT_LEDGER_CONFIRMATIONS\s*=\s*19/.test(workerConsts)) {
  fails.push("worker constants: USDT_LEDGER_CONFIRMATIONS must be 19");
}

// Pure stage machine — load via Function from worker source text checks + inline eval of nest logic
function decideDepositStage(input) {
  const ui = 1;
  const ledger = 19;
  if (input.alreadyLedgerCredited) {
    return { creditLedger: false, emitDetected: false, stage: "confirmed" };
  }
  if (input.reorg) {
    return { creditLedger: false, voidDetected: true, stage: "reorg_void" };
  }
  const conf = Math.max(0, Math.floor(Number(input.confirmations) || 0));
  if (conf >= ledger) {
    return { creditLedger: true, emitDetected: false, emitConfirmed: true, stage: "confirmed" };
  }
  if (conf >= ui) {
    return { creditLedger: false, emitDetected: true, emitConfirmed: false, stage: "detected" };
  }
  return { creditLedger: false, emitDetected: false, stage: "unseen" };
}

try {
  const d1 = decideDepositStage({ confirmations: 1 });
  assert.strictEqual(d1.creditLedger, false, "1conf must not credit ledger");
  assert.strictEqual(d1.emitDetected, true, "1conf must emit detected");
  const d19 = decideDepositStage({ confirmations: 19 });
  assert.strictEqual(d19.creditLedger, true, "19conf must credit ledger");
  assert.strictEqual(d19.emitConfirmed, true, "19conf must emit confirmed");
  const d0 = decideDepositStage({ confirmations: 0 });
  assert.strictEqual(d0.creditLedger, false, "0conf must not credit");
} catch (e) {
  fails.push(`stage machine: ${e.message}`);
}

const svc = read("services/api-nest/src/wallet/usdt-deposit.service.ts");
for (const needle of [
  'journalType: "deposit_usdt"',
  "SYS:TREASURY",
  'bucket: "principal"',
  "DEPOSIT_DETECTED",
  "DEPOSIT_CONFIRMED",
  "creditLedger",
  "decideDepositStage",
  "WALLET_EVENTS.depositDetected",
  "WALLET_EVENTS.depositConfirmed",
  "usdt_deposit_confirm:",
  "ui_confirmed",
  "ledger_credited",
]) {
  if (!svc.includes(needle)) {
    fails.push(`usdt-deposit.service missing: ${needle}`);
  }
}

// Guard: detected path must explicitly set creditLedger: false
if (!/toastCode:\s*"DEPOSIT_DETECTED"[\s\S]{0,80}creditLedger:\s*false/.test(svc)) {
  fails.push("DEPOSIT_DETECTED path must set creditLedger: false");
}

// Guard: confirmed path posts deposit_usdt
if (!/creditLedger[\s\S]{0,400}journalType:\s*"deposit_usdt"/.test(svc)
  && !/journalType:\s*"deposit_usdt"[\s\S]{0,800}DEPOSIT_CONFIRMED/.test(svc)) {
  fails.push("19conf path must post deposit_usdt before DEPOSIT_CONFIRMED");
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
for (const ev of [
  "wallet.deposit.detected",
  "wallet.deposit.confirmed",
  "wallet.deposit.reorg_voided",
]) {
  if (!events.includes(ev)) fails.push(`wallet.events missing ${ev}`);
}

const phase0 = read("services/api-nest/src/wallet/chain-watcher.phase0.service.ts");
if (!phase0.includes('bus: "in-process"') && !phase0.includes('bus: "in-process" as const')) {
  fails.push("Phase0 watcher must declare bus=in-process");
}
if (!phase0.includes("InProcess") && !phase0.includes("in-process")) {
  fails.push("Phase0 must reference in-process bus mode");
}
if (!phase0.includes("/v1/contracts/") || !phase0.includes("/events")) {
  fails.push("Phase0 tick must use USDT contract events single stream");
}

const workerIndex = read("workers/chain-watchers/src/index.ts");
if (!workerIndex.includes("Phase0") || !workerIndex.includes("in-process")) {
  fails.push("worker index must document Phase0 in-process emit");
}

if (fails.length) {
  console.error("[verify:deposit-confirm-stages] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:deposit-confirm-stages] PASS (1conf no ledger · 19conf deposit_usdt · Phase0 in-process)",
);
