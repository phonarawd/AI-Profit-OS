/**
 * verify:market-briefing-no-investment-advice — UI §51.20 PART8b
 * Weekly Market Briefing · 투자권유 금지 · route+Canon+copy · ghost 해소
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
  "packages/ui/components/trust/WeeklyMarketBriefing.tsx",
  "packages/ui/canon/surfaces/market-weekly-briefing.wire.json",
  "packages/ui/copy/ko/guide.ts",
  "apps/web/app/me/guide/market-weekly/page.tsx",
  "apps/web/routes.ts",
  "schemas/simulation-report.v1.json",
];
for (const f of files) mustExist(f);

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/market-weekly-briefing.wire.json") || "{}",
);
if (wire.id !== "market-weekly-briefing") {
  fails.push("wire.id must be market-weekly-briefing");
}
if (wire.route !== "/me/guide/market-weekly") {
  fails.push("wire.route must be /me/guide/market-weekly");
}
const forb = wire.forbidden || [];
for (const need of [
  "investment_advice",
  "buy_now_cta",
  "sell_now_cta",
  "guaranteed_profit",
  "photo_pixel_match",
]) {
  if (!forb.includes(need)) fails.push(`wire.forbidden missing ${need}`);
}

const man = JSON.parse(read("packages/ui/canon/manifest.json") || "{}");
const ids = (man.surfaces || []).map((s) => s.id);
if (!ids.includes("market-weekly-briefing")) {
  fails.push("canon/manifest missing market-weekly-briefing");
}

const routes = read("apps/web/routes.ts");
if (!routes.includes('"/me/guide/market-weekly"')) {
  fails.push('USER_NESTED_ROUTES must lock "/me/guide/market-weekly"');
}

const guide = read("packages/ui/copy/ko/guide.ts");
for (const key of [
  "marketWeekly:",
  "title:",
  "eduPurpose:",
  "disclaimer:",
  "bulletP50:",
]) {
  if (!guide.includes(key)) fails.push(`guide.ts marketWeekly missing ${key}`);
}

const briefing = read("packages/ui/components/trust/WeeklyMarketBriefing.tsx");
for (const needle of [
  'data-testid="weekly-market-briefing"',
  'data-investment-advice="false"',
  'data-ui-recompute="false"',
  "T.guide.marketWeekly",
  "spreadDistribution",
]) {
  if (!briefing.includes(needle)) {
    fails.push(`WeeklyMarketBriefing missing ${needle}`);
  }
}

const page = read("apps/web/app/me/guide/market-weekly/page.tsx");
if (!page.includes("WeeklyMarketBriefing")) {
  fails.push("market-weekly page must mount WeeklyMarketBriefing");
}

// Investment advice / buy-sell directive phrases — copy + component scan
const banned = [
  "지금 사세요",
  "지금 파세요",
  "매수하세요",
  "매도하세요",
  "사세요",
  "파세요",
  "투자 추천",
  "확정 수익",
  "보장 수익",
  "100% 수익",
];
const scanTargets = [guide, briefing, page];
for (const src of scanTargets) {
  for (const phrase of banned) {
    if (src.includes(phrase)) {
      fails.push(`investment-advice phrase forbidden: ${phrase}`);
    }
  }
}

// Settings push category pointer
const settings = read("packages/ui/copy/ko/settings.ts");
if (!settings.includes("marketWeekly:")) {
  fails.push("settings.notify must include marketWeekly (push opt-out)");
}

if (fails.length) {
  console.error(
    "[verify:market-briefing-no-investment-advice] FAIL\n- " +
      fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:market-briefing-no-investment-advice] PASS (route+Canon+copy · 투자권유0)",
);
