/**
 * BACKEND-ONLY PORT of tooling/verify/withdraw-mode-default.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:withdraw-mode-default — Money §49.1 · E2
 * Default withdraw mode must be profit · never open as principal by default.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "services/api-nest/src/wallet/wallet.controller.ts",
  "schemas/withdraw-intent.v1.json",
];
for (const f of files) mustExist(f);

const controller = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!controller.includes('?? "profit"') && !controller.includes("?? 'profit'")) {
  fails.push("WalletController createWithdraw must default mode to profit");
}

const intentSvc = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
if (!intentSvc.includes('input.mode ?? "profit"') && !intentSvc.includes("input.mode ?? 'profit'")) {
  fails.push("WithdrawIntentService must default mode to profit");
}

const schema = JSON.parse(read("schemas/withdraw-intent.v1.json"));
const desc = String(schema.description || "");
if (!/default mode=profit/i.test(desc) && !/mode=profit/i.test(desc)) {
  fails.push("withdraw-intent.v1 description must lock default mode=profit");
}
if (!schema.properties?.mode?.enum?.includes("profit")) {
  fails.push("withdraw-intent.v1 mode enum must include profit");
}

if (fails.length) {
  console.error("[verify:withdraw-mode-default] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:withdraw-mode-default] PASS (default mode=profit · E2 locked)",
);
