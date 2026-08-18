/**
 * verify:no-per-address-poll — Money §41.1 · §43.1 · §43.7
 * Per-address high-frequency polling code path = 0
 * Required: USDT contract single event stream + local address Set match
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === "dist" ||
      ent.name === ".next" ||
      ent.name === "coverage" ||
      ent.name === "target"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

const required = [
  "workers/chain-watchers/src/usdt-trc20-event-stream.ts",
  "workers/chain-watchers/src/address-index.ts",
  "workers/chain-watchers/src/confirmation-tracker.ts",
  "workers/chain-watchers/src/rate-limit-budgeter.ts",
  "workers/chain-watchers/wrangler.toml",
  "services/api-nest/src/wallet/chain-watcher.phase0.service.ts",
  "infra/workers.manifest.json",
];
for (const f of required) mustExist(f);

const stream = read("workers/chain-watchers/src/usdt-trc20-event-stream.ts");
for (const needle of [
  "FORBIDDEN",
  "/v1/contracts/",
  "event_name",
  "Transfer",
  "AddressIndex",
  "CHAIN_WATCHER_MODE",
  "event_stream",
]) {
  if (!stream.includes(needle)) {
    fails.push(`usdt-trc20-event-stream missing: ${needle}`);
  }
}

const addrIdx = read("workers/chain-watchers/src/address-index.ts");
if (!addrIdx.includes("resolveUserId") || !addrIdx.includes("FORBIDDEN")) {
  fails.push("address-index must O(1) resolve + forbid per-address poll");
}

const phase0 = read("services/api-nest/src/wallet/chain-watcher.phase0.service.ts");
if (!phase0.includes("/v1/contracts/") || !phase0.includes("events")) {
  fails.push("Phase0 must use contract events stream");
}
if (!phase0.includes("loadAddressIndex") && !phase0.includes("byAddr")) {
  fails.push("Phase0 must match local address index (not per-addr RPC)");
}
if (phase0.includes("perAddressPoll: false") === false) {
  fails.push("Phase0 describe() must set perAddressPoll: false");
}

const cfg = read("schemas/deposit-config.v1.json");
if (!cfg.includes('"const": "event_stream"')) {
  fails.push("deposit-config must lock chainWatcherMode=event_stream");
}

const types = read("services/api-nest/src/wallet/wallet.types.ts");
if (!types.includes('chainWatcherMode: "event_stream"')) {
  fails.push("DAY1 types must lock chainWatcherMode event_stream");
}

// Forbidden *live* patterns (strip block/line comments first)
const deny = [
  /chainWatcherPollMs\s*=\s*100/,
  /getTransactionsFromAddress\s*\(/,
  /\/v1\/accounts\/[^/\s]+\/transactions/,
  /accounts\/\$\{[^}]+\}\/transactions/,
];

const scanDirs = [
  path.join(root, "workers", "chain-watchers"),
  path.join(root, "services", "api-nest", "src", "wallet"),
];

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const hits = [];
for (const dir of scanDirs) {
  walk(dir, (file) => {
    if (!/\.(ts|tsx|js|cjs|mjs)$/.test(file)) return;
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const t = stripComments(fs.readFileSync(file, "utf8"));
    for (const re of deny) {
      if (re.test(t)) hits.push(`${rel} :: ${re}`);
    }
  });
}

// Tighter: no loop that polls addresses in stream module (code only)
const streamCode = stripComments(stream);
if (/for\s*\([^)]*addresses[^)]*\)\s*\{[\s\S]{0,200}fetch/i.test(streamCode)) {
  fails.push("event-stream must not loop addresses with fetch");
}
if (/for\s*\([^)]*of\s*users[^)]*\)/i.test(streamCode)) {
  fails.push("event-stream must not iterate users for poll");
}

if (hits.length) {
  for (const h of hits) fails.push(`forbidden poll pattern: ${h}`);
}

const manifest = JSON.parse(read("infra/workers.manifest.json"));
if (!Array.isArray(manifest.phase1) || !manifest.phase1.includes("chain-watchers")) {
  fails.push("infra/workers.manifest.json phase1 must include chain-watchers");
}
if (Array.isArray(manifest.phase0) && manifest.phase0.includes("chain-watchers")) {
  fails.push("phase0 must NOT deploy chain-watchers (Nest in-process owns Phase0)");
}

const wrangler = read("workers/chain-watchers/wrangler.toml");
if (!wrangler.includes('name = "chain-watchers"')) {
  fails.push("chain-watchers wrangler.toml missing name");
}

if (fails.length) {
  console.error("[verify:no-per-address-poll] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:no-per-address-poll] PASS (single stream · address Set · phase1 deploy · phase0 nest)",
);
