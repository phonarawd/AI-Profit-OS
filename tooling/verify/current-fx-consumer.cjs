/**
 * verify:current-fx-consumer — HC6-08 Architecture C
 * static grep + file existence. not a new platform.
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

function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

const requiredFiles = [
  "schemas/current-fx-approx-request.v1.json",
  "schemas/current-fx-approx.v1.json",
  "services/api-nest/src/current-fx/current-fx.routes.ts",
  "services/api-nest/src/current-fx/current-fx.user.controller.ts",
  "services/api-nest/src/current-fx/current-fx-approx.service.ts",
  "services/api-nest/src/current-fx/current-fx-approx.apply.ts",
  "services/api-nest/src/current-fx/current-fx.module.ts",
  "packages/sdk/src/current-fx/types.ts",
  "packages/sdk/src/current-fx/fetch.ts",
  "packages/sdk/src/current-fx/index.ts",
];
for (const f of requiredFiles) mustExist(f);

const reqSchema = JSON.parse(read("schemas/current-fx-approx-request.v1.json") || "{}");
const resSchema = JSON.parse(read("schemas/current-fx-approx.v1.json") || "{}");
if (reqSchema.additionalProperties !== false) {
  fails.push("request schema additionalProperties must be false");
}
if (resSchema.additionalProperties !== false) {
  fails.push("response schema additionalProperties must be false");
}
for (const key of ["principalUsdt", "withdrawableProfitUsdt", "expectedProfitUsdt"]) {
  if (!(reqSchema.required || []).includes(key)) {
    fails.push(`request schema must require ${key}`);
  }
}
if (resSchema.properties?.usdtKrw) {
  fails.push("response schema must omit usdtKrw");
}
if (resSchema.properties?.formulaId || resSchema.properties?.sources) {
  fails.push("response schema must omit formulaId/sources");
}

const manifest = read("schemas/manifest.day1.json");
if (!manifest.includes("current-fx-approx-request.v1.json")) {
  fails.push("manifest.day1 must list current-fx-approx-request.v1.json");
}
if (!manifest.includes("current-fx-approx.v1.json")) {
  fails.push("manifest.day1 must list current-fx-approx.v1.json");
}

const svc = read("services/api-nest/src/current-fx/current-fx-approx.service.ts");
const apply = read("services/api-nest/src/current-fx/current-fx-approx.apply.ts");
const routes = read("services/api-nest/src/current-fx/current-fx.routes.ts");
const ctl = read("services/api-nest/src/current-fx/current-fx.user.controller.ts");
const mod = read("services/api-nest/src/current-fx/current-fx.module.ts");
const fxSvc = read("services/api-nest/src/opportunities/fx-snapshot.service.ts");
const appMod = read("services/api-nest/src/app.module.ts");

if (/HomeRead/.test(codeOnly(svc)) || /HomeRead/.test(codeOnly(apply))) {
  fails.push("apply service HomeRead import/use 0");
}
if (/getForUser/.test(codeOnly(svc)) || /getForUser/.test(codeOnly(apply))) {
  fails.push("apply service getForUser 0");
}
if (
  /WalletModule|LedgerModule|getUserBuckets/.test(codeOnly(svc)) ||
  /WalletModule|LedgerModule|getUserBuckets/.test(codeOnly(apply))
) {
  fails.push("apply service Wallet/Ledger read 0");
}
if (!svc.includes("getLatestCurrentFxSnapshot")) {
  fails.push("apply service must use getLatestCurrentFxSnapshot");
}
if ((svc.match(/getLatestCurrentFxSnapshot\(/g) || []).length !== 1) {
  fails.push("apply service getLatestCurrentFxSnapshot call sites must be 1");
}
if (!apply.includes("approxKrwFromSnapshot")) {
  fails.push("apply must reuse approxKrwFromSnapshot");
}
if (!fxSvc.includes("getLatestCurrentFxSnapshot")) {
  fails.push("FxSnapshotService must add getLatestCurrentFxSnapshot");
}
if (!appMod.includes("CurrentFxModule")) {
  fails.push("AppModule must import CurrentFxModule");
}
if (/HomeReadModule|WalletModule|LedgerModule/.test(mod)) {
  fails.push("CurrentFxModule must not import HomeRead/Wallet/Ledger");
}
if (!routes.includes('approx: "me/current-fx/approx"')) {
  fails.push('route constant must be me/current-fx/approx');
}
if (/["']me\/current-fx["']/.test(routes)) {
  fails.push("raw GET me/current-fx route constant forbidden");
}
if (/@Get/.test(ctl) || /home-approx/.test(ctl) || /home-approx/.test(routes)) {
  fails.push("raw GET / home-approx handler forbidden");
}

const clientFiles = ["packages/sdk/src/current-fx/fetch.ts"];
const { isGreenfieldConsumerUi } = require("./lib/greenfield-consumer.cjs");
if (!isGreenfieldConsumerUi()) {
  clientFiles.push(
    "apps/web/app/home-clean/HomeCleanDataAdapter.tsx",
    "apps/web/app/home-clean/mapHomeReadModelToCleanViewModel.ts",
    "packages/ui/components/home-clean-v1/home-clean-money.ts",
    "packages/ui/components/home-clean-v1/HomeCleanAsset.tsx",
    "packages/ui/components/home-clean-v1/HomeCleanView.tsx",
  );
}
const client = clientFiles.map((f) => codeOnly(read(f))).join("\n");
if (/mulAmount/.test(client)) fails.push("client mulAmount 0");
if (/usdtKrw/.test(client)) fails.push("client usdtKrw consumption 0");
if (/parseFloat\s*\(/.test(client) && /usdtKrw|fx|rate/i.test(client)) {
  fails.push("client parseFloat FX 0");
}
if (/Number\s*\([^)]*\)\s*\*/.test(client) || /\*\s*Number\s*\(/.test(client)) {
  fails.push("client Number * FX 0");
}
if (/\/me\/current-fx["']/.test(client) && !/\/me\/current-fx\/approx/.test(client)) {
  fails.push("raw GET current-fx client call 0");
}

const homeRead = [
  "schemas/home-read-model.v1.json",
  "packages/sdk/src/home-read-model/types.ts",
]
  .map(read)
  .join("\n");
if (/usdtKrw|principalKrwApprox|fxSnapshotId|currentFx/.test(homeRead)) {
  fails.push("HomeReadModel FX field 0");
}

const bucketsSchema = read("schemas/wallet-buckets.v1.json");
const bucketsTypeMatch = read("packages/sdk/src/wallet/types.ts").match(
  /export type WalletBucketsResponse = \{[\s\S]*?\};/,
);
const bucketsType = bucketsTypeMatch ? bucketsTypeMatch[0] : "";
if (!bucketsType) {
  fails.push("WalletBucketsResponse type missing");
}
if (/usdtKrw|KrwApprox|fxSnapshot/.test(`${bucketsSchema}\n${bucketsType}`)) {
  fails.push("Wallet buckets DTO FX field 0");
}

if (!isGreenfieldConsumerUi()) {
  const hcCopy = read("packages/ui/components/home-clean-v1/home-clean-copy.ts");
  const hcAsset = read("packages/ui/components/home-clean-v1/HomeCleanAsset.tsx");
  if (/원화 잔액|KRW 잔액|보유 원화/.test(`${hcCopy}${hcAsset}`)) {
    fails.push("raw KRW balance alias HomeClean 0");
  }
}

const depositSvc = read("services/api-nest/src/wallet/krw-deposit.service.ts");
if (/mulAmount|parseFloat\s*\(.*usdtKrw/.test(codeOnly(depositSvc))) {
  fails.push("deposit service must not client-multiply FX");
}

if (fails.length) {
  console.error("verify:current-fx-consumer FAIL");
  for (const f of fails) console.error(`- ${f}`);
  process.exit(1);
}
console.log("verify:current-fx-consumer PASS");
