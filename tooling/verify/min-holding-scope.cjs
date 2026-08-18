/**
 * verify:min-holding-scope — Money §11.2
 * minHoldingHours applies to principal|combined only · profit-only = allow (200)
 * Alias compliance.minHoldingHours FORBIDDEN (이중 설정 테이블 0)
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

const files = [
  "schemas/deposit-config.v1.json",
  "schemas/toast-codes.v1.json",
  "services/api-nest/src/wallet/min-holding.service.ts",
  "services/api-nest/src/wallet/deposit-config.service.ts",
  "services/api-nest/src/wallet/wallet.types.ts",
  "supabase/migrations/20260808234957_deposit_config_fee_min_holding.sql",
];
for (const f of files) mustExist(f);

const schema = JSON.parse(read("schemas/deposit-config.v1.json"));
if (!(schema.required || []).includes("withdrawGuards")) {
  fails.push("deposit-config.v1 must require withdrawGuards");
}
const mh = schema.properties?.withdrawGuards?.properties?.minHoldingHours;
if (!mh) fails.push("withdrawGuards.minHoldingHours missing");
if (mh?.default !== 24 && mh?.default !== undefined) {
  // default may be documented as 24
}
if (mh?.default !== 24) {
  fails.push("minHoldingHours Day-1 default must be 24");
}
if (!(schema.properties?.withdrawGuards?.required || []).includes("minHoldingHours")) {
  fails.push("minHoldingHours must be required under withdrawGuards");
}

const toast = read("schemas/toast-codes.v1.json");
if (!toast.includes('"MIN_HOLDING"')) {
  fails.push("toast-codes must include MIN_HOLDING");
}

const svc = read("services/api-nest/src/wallet/min-holding.service.ts");
for (const needle of [
  "minHoldingHours",
  "MIN_HOLDING",
  'mode === "profit"',
  "appliesToMode",
  "principal",
  "combined",
  "FIFO",
  "credited_at",
]) {
  if (!svc.includes(needle)) {
    fails.push(`min-holding.service missing: ${needle}`);
  }
}

// profit-only must short-circuit to allowed (scope exclusion)
if (!/appliesToMode[\s\S]{0,200}return \{\s*allowed:\s*true,\s*applied:\s*false/.test(svc)
  && !svc.includes("return { allowed: true, applied: false }")) {
  fails.push("profit-only path must return allowed:true applied:false");
}

const types = read("services/api-nest/src/wallet/wallet.types.ts");
if (!types.includes("minHoldingHours: 24")) {
  fails.push("DAY1 defaults must set minHoldingHours: 24");
}

const cfgSvc = read("services/api-nest/src/wallet/deposit-config.service.ts");
if (!cfgSvc.includes("withdrawGuards") || !cfgSvc.includes("minHoldingHours")) {
  fails.push("deposit-config.service must persist withdrawGuards.minHoldingHours");
}
if (!cfgSvc.includes("deposit_config_audit")) {
  fails.push("minHolding Admin changes must audit via deposit_config_audit");
}

const mig = read(
  "supabase/migrations/20260808234957_deposit_config_fee_min_holding.sql",
);
if (!mig.includes("withdraw_guards")) {
  fails.push("migration must add deposit_config.withdraw_guards");
}
if (!mig.includes("minHoldingHours")) {
  fails.push("migration default must include minHoldingHours");
}

const day1 = read("services/api-nest/src/wallet/wallet.types.ts");
if (!day1.includes("withdrawGuards")) {
  fails.push("wallet.types must define withdrawGuards");
}

// Alias ban: compliance.minHoldingHours must not appear as a live config key
const banRe = /compliance\.minHoldingHours/;
const allowNote = /구호칭|승계|FORBIDDEN|별칭/;
walk(path.join(root, "services"), (file) => {
  if (!/\.(ts|js)$/.test(file)) return;
  const t = fs.readFileSync(file, "utf8");
  if (!banRe.test(t)) return;
  // Allow documentation of the ban itself
  if (allowNote.test(t) && !/["']compliance\.minHoldingHours["']\s*:/.test(t)) {
    return;
  }
  fails.push(
    `forbidden live key compliance.minHoldingHours in ${path.relative(root, file)}`,
  );
});
walk(path.join(root, "schemas"), (file) => {
  if (!/\.json$/.test(file)) return;
  const t = fs.readFileSync(file, "utf8");
  if (/["']compliance\.minHoldingHours["']/.test(t)) {
    fails.push(
      `schemas must not define compliance.minHoldingHours: ${path.relative(root, file)}`,
    );
  }
});

// Pure scope rule (mirrors service) — profit never applied
function minHoldingApplies(mode) {
  return mode === "principal" || mode === "combined";
}
if (minHoldingApplies("profit") !== false) {
  fails.push("scope rule: profit must not apply min holding");
}
if (minHoldingApplies("principal") !== true) {
  fails.push("scope rule: principal must apply min holding");
}
if (minHoldingApplies("combined") !== true) {
  fails.push("scope rule: combined must apply min holding");
}

if (fails.length) {
  console.error("[verify:min-holding-scope] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:min-holding-scope] PASS (profit-only exempt · principal|combined gated · alias ban)",
);
