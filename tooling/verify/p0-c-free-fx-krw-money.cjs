"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const policy = require(path.join(
  root,
  "services/market-intelligence/src/fx-display-policy.cjs",
));
try {
  policy.selftestFxDisplayPolicy();
} catch (e) {
  fails.push("fx-display-policy selftest: " + (e && e.message ? e.message : e));
}

const fx = require(path.join(
  root,
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
));

const usd = fx.normalizeNativeToUsdt({
  nativeAmount: "100",
  nativeCurrency: "USD",
  snapshot: { usdtPerUsd: "0.999" },
});
if (fx.withinTolerance(usd.normalizedUsdt, "100")) {
  fails.push("USD must not equal USDT when usdtPerUsd != 1");
}
if (!fx.withinTolerance(usd.normalizedUsdt, "99.9")) {
  fails.push("USD->USDT got " + usd.normalizedUsdt);
}

const gbp = fx.normalizeNativeToUsdt({
  nativeAmount: "100",
  nativeCurrency: "GBP",
  snapshot: { gbpUsd: "1.27", usdtPerUsd: "0.999" },
});
if (!fx.withinTolerance(gbp.normalizedUsdt, "126.873")) {
  fails.push("GBP->USDT got " + gbp.normalizedUsdt);
}

const eur = fx.normalizeNativeToUsdt({
  nativeAmount: "80",
  nativeCurrency: "EUR",
  snapshot: { eurUsd: "1.08", usdtPerUsd: "1.002" },
});
if (!fx.withinTolerance(eur.normalizedUsdt, "86.5728")) {
  fails.push("EUR->USDT got " + eur.normalizedUsdt);
}

const aud = fx.normalizeNativeToUsdt({
  nativeAmount: "50",
  nativeCurrency: "AUD",
  snapshot: { audUsd: "0.66", usdtPerUsd: "1.001" },
});
if (!fx.withinTolerance(aud.normalizedUsdt, "33.033")) {
  fails.push("AUD->USDT got " + aud.normalizedUsdt);
}

const identity = fx.normalizeNativeToUsdt({
  nativeAmount: "10",
  nativeCurrency: "USDT",
  snapshot: {},
});
if (!fx.withinTolerance(identity.normalizedUsdt, "10")) {
  fails.push("USDT identity got " + identity.normalizedUsdt);
}

let jpyThrew = false;
try {
  fx.normalizeNativeToUsdt({
    nativeAmount: "1000",
    nativeCurrency: "JPY",
    snapshot: { usdtPerUsd: "1" },
  });
} catch (e) {
  jpyThrew = true;
}
if (!jpyThrew) fails.push("JPY must fail-closed (unsupported Day-1 currency)");

const krw = fx.approxKrwFromSnapshot("134.75", { usdtKrw: "1387" });
if (!fx.withinTolerance(krw, "186898.25")) {
  fails.push("USDT->KRW got " + krw);
}
if (policy.roundKrwDisplay(krw) !== "186898") {
  fails.push("KRW display round " + policy.roundKrwDisplay(krw));
}

const cg = read("workers/coingecko-adapter/wrangler.toml");
if (!cg.includes('crons = ["*/10 * * * *"]')) {
  fails.push("CoinGecko cron must be */10 for Demo 10k budget");
}
if (cg.includes("*/5 * * * *")) fails.push("CoinGecko 5-minute cron exceeds Demo budget");

const cgClient = read("workers/coingecko-adapter/src/client.ts");
if (!cgClient.includes("vs_currencies")) fails.push("CoinGecko must batch vs_currencies");
if (!cgClient.includes("include_last_updated_at")) {
  fails.push("CoinGecko must request last_updated_at");
}
if (!cgClient.includes("shouldRetry") || !cgClient.includes("429")) {
  fails.push("CoinGecko client must bound retry and skip 429");
}

const cgIdx = read("workers/coingecko-adapter/src/index.ts");
if (!cgIdx.includes("inflight") || !cgIdx.includes("MIN_FETCH_GAP_MS")) {
  fails.push("CoinGecko worker must single-flight + unique fetch window");
}
if (!cgIdx.includes("FREE_DEMO")) fails.push("CoinGecko worker must declare FREE_DEMO");
if (!cgIdx.includes("lastFetchAt") || !cgIdx.includes("consecutiveFailures")) {
  fails.push("CoinGecko health must expose fetch/failure observability");
}
if (/pro-api\.coingecko|x-cg-pro-api-key/.test(cgIdx + cgClient)) {
  fails.push("paid CoinGecko plan must not be referenced");
}

const frank = read("workers/frankfurter-adapter/src/client.ts");
if (!/GBP/.test(frank) || !/EUR/.test(frank) || !/AUD/.test(frank)) {
  fails.push("Frankfurter must still fetch GBP/EUR/AUD");
}
if (/divAmount|mulAmount/.test(frank)) {
  fails.push("Frankfurter must remain raw-relay-only");
}

const nestFx = read("services/api-nest/src/opportunities/fx-snapshot.service.ts");
if (!nestFx.includes("classifyFxFreshness") || !nestFx.includes("krwDisplayAvailable")) {
  fails.push("Nest KRW display must fail-closed on freshness");
}
if (!nestFx.includes("rate_provenance?.usdtKrw?.capturedAt")) {
  fails.push("KRW display must use usdtKrw provenance, not row captured_at");
}
if (/UPDATE public\.fx_snapshots/.test(nestFx)) {
  fails.push("fx_snapshots immutability regression");
}

const userSvc = read("services/api-nest/src/opportunities/opportunities.user.service.ts");
if (/expectedProfitKrwApprox[\s\S]{0,80}: 0/.test(userSvc)) {
  fails.push("feed KRW must not default to 0");
}
if (!userSvc.includes("approxKrwOrNull")) {
  fails.push("feed KRW must compute from live snapshot");
}

const approx = read("services/api-nest/src/opportunities/current-fx-approx.service.ts");
if (/\bNumber\s*\(|parseFloat/.test(approx)) {
  fails.push("current-fx service must not Number() money");
}
if (!approx.includes("krwDisplayAvailable") || !approx.includes("quotes")) {
  fails.push("current-fx must expose status + quotes");
}

const sdk = read("packages/sdk/src/current-fx/fetch.ts");
if (!sdk.includes("/api/v1/me/current-fx/approx")) {
  fails.push("SDK path drift");
}

const webClients = [
  "apps/web/app/HomeDesktopClient.tsx",
  "apps/web/app/ProfitsDesktopClient.tsx",
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
  "apps/web/app/wallet/WalletClient.tsx",
];
for (const rel of webClients) {
  const src = read(rel);
  if (!src.includes("startFxBackgroundRefresh")) {
    fails.push(rel + " must background-refresh our FX API");
  }
  if (/api\.coingecko\.com|api\.frankfurter/.test(src)) {
    fails.push(rel + " must not call upstream FX providers");
  }
}

const homeMap = read("apps/web/components/spark-dash-home/map-runtime.ts");
if (!/capitalKrw:\s*null/.test(homeMap)) {
  fails.push("Home runtime must keep capitalKrw null (presentation freeze)");
}

const moneyUi = read("packages/ui/components/money/MoneyAmount.tsx");
if (!moneyUi.includes("putduk-money") || !moneyUi.includes("aria-label")) {
  fails.push("shared MoneyAmount missing a11y/status");
}

const copy = read("packages/ui/copy/ko/money.ts");
if (!copy.includes("krwApprox") || !copy.includes("CoinGecko")) {
  fails.push("T.money must include KRW copy + CoinGecko attribution");
}

const footer = read("packages/ui/components/shell/SiteFooter.tsx");
if (!footer.includes("T.money.attribution")) {
  fails.push("SiteFooter must attribute CoinGecko");
}

const ebay = read("workers/ebay-adapter/wrangler.toml");
if (!ebay.includes("ebay-adapter")) fails.push("ebay adapter vanished");

try {
  const diff = execSync("git diff --name-only origin/main", {
    cwd: root,
    encoding: "utf8",
  });
  const touched = diff.split(/\r?\n/).filter(Boolean);
  for (const f of touched) {
    if (f.startsWith("workers/ebay-adapter/")) {
      fails.push("P0-B regression: ebay-adapter must stay untouched, got " + f);
    }
  }
} catch (e) {
  fails.push("git diff origin/main failed: " + (e && e.message ? e.message : e));
}

if (!read("package.json").includes("verify:p0-c-free-fx-krw-money")) {
  fails.push("package.json missing verify:p0-c-free-fx-krw-money");
}
if (!read("tooling/verify/CATALOG.md").includes("p0-c-free-fx-krw-money")) {
  fails.push("CATALOG missing p0-c-free-fx-krw-money");
}
if (!read("tooling/verify/domain-by-path.cjs").includes("p0-c-free-fx-krw-money.cjs")) {
  fails.push("domain-by-path missing p0-c-free-fx-krw-money.cjs");
}
if (!read(".github/workflows/gate.yml").includes("verify:p0-c-free-fx-krw-money")) {
  fails.push("gate.yml missing verify:p0-c-free-fx-krw-money");
}

if (fails.length) {
  console.error("[verify:p0-c-free-fx-krw-money] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:p0-c-free-fx-krw-money] PASS (Demo budget, single-flight, freshness fail-closed, USD!=USDT, KRW secondary, no fabricated 0, P0-B ebay untouched)",
);
