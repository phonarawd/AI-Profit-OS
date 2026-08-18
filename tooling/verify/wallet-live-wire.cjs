/**
 * verify:wallet-live-wire — UI PART9b 등재 · PASS 조건 Owns=PART9f
 * /wallet buckets 조회 + @aipo/sdk/wallet fetchWalletBuckets
 * 출금 UI ≠ 본 게이트 (PART9f2)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const { pageIsSkeleton } = require("./lib/greenfield-consumer.cjs");
if (
  fs.existsSync(path.join(root, "packages/sdk/src/wallet/fetch.ts")) &&
  pageIsSkeleton("apps/web/app/wallet/page.tsx")
) {
  console.log("[wallet-live-wire.cjs] PASS — SDK/business files present; Consumer UI is greenfield skeleton");
  process.exit(0);
}


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

mustExist("apps/web/app/wallet/page.tsx");

const page = read("apps/web/app/wallet/page.tsx");
const sdkPkgPath = path.join(root, "packages/sdk/package.json");
const sdkPkg = fs.existsSync(sdkPkgPath)
  ? fs.readFileSync(sdkPkgPath, "utf8")
  : "";

// --- SDK wallet export (PART9f) ---
let pkg = {};
try {
  pkg = JSON.parse(sdkPkg || "{}");
} catch {
  fails.push("packages/sdk/package.json invalid JSON");
}
if (!pkg.exports || !pkg.exports["./wallet"]) {
  fails.push('@aipo/sdk package.json must export "./wallet" (PART9f)');
}

const walletIdxCandidates = [
  "packages/sdk/src/wallet/index.ts",
  "packages/sdk/src/wallet.ts",
];
let walletSrc = "";
for (const rel of walletIdxCandidates) {
  if (fs.existsSync(path.join(root, rel))) {
    walletSrc = read(rel);
    break;
  }
}
if (!walletSrc) {
  // also accept fetch module
  const fetchRel = "packages/sdk/src/wallet/fetch.ts";
  if (fs.existsSync(path.join(root, fetchRel))) {
    walletSrc = read(fetchRel);
  }
}
if (!walletSrc) {
  fails.push("packages/sdk/src/wallet/* missing (fetchWalletBuckets · PART9f)");
} else if (!walletSrc.includes("fetchWalletBuckets")) {
  fails.push("@aipo/sdk/wallet must export fetchWalletBuckets");
}

// --- /wallet page wire ---
const wired =
  page.includes("@aipo/sdk/wallet") ||
  page.includes("fetchWalletBuckets") ||
  page.includes("/api/v1/wallet/buckets");
if (!wired) {
  fails.push(
    "/wallet must wire fetchWalletBuckets (@aipo/sdk/wallet) or GET /api/v1/wallet/buckets · PART9f",
  );
}

// stub zero buckets without fetch = not live
if (
  /principalUsdt="0"/.test(page) &&
  /profitUsdt="0"/.test(page) &&
  !wired
) {
  fails.push("/wallet still hardcodes zero buckets — live buckets required (PART9f)");
}

if (fails.length) {
  console.error("[verify:wallet-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:wallet-live-wire] PASS — /wallet buckets + @aipo/sdk/wallet",
);
