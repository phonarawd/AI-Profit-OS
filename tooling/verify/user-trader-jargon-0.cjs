/**
 * verify:user-trader-jargon-0 — Engine §4.2b · Index §20.2 · UI §48
 * 유저 surface trader 용어 0 · executionPlatforms/expectedSellDays 유저0 ·
 * 대기 Fact 소스 가드 · INTERNAL↔USER 맵 · Admin 예외
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

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ["node_modules", ".git", "dist", ".next", "coverage"].includes(ent.name)
      ) {
        continue;
      }
      walkFiles(full, exts, out);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

mustExist("services/market-intelligence/src/capital-provider-projection.cjs");
mustExist("packages/ui/copy/ko/opportunity.ts");
mustExist("packages/ui/copy/ko/execution.ts");
mustExist("packages/ui/canon/surfaces/opportunity-card.wire.json");
mustExist("packages/ui/canon/surfaces/opportunity-detail.wire.json");
mustExist("packages/ui/canon/surfaces/execution-running.wire.json");

const mi = require(path.join(
  root,
  "services/market-intelligence/src/capital-provider-projection.cjs",
));

// --- Engine invariants ---
const inv = mi.assertCapitalProviderProjectionInvariants();
if (!inv.ok) fails.push(...inv.fails.map((f) => `projection: ${f}`));

if (
  JSON.stringify([...mi.USER_SURFACE_STRIP_KEYS].sort()) !==
  JSON.stringify(["executionPlatforms", "expectedSellDays"].sort())
) {
  fails.push(
    `USER_SURFACE_STRIP_KEYS want [executionPlatforms, expectedSellDays] got ${JSON.stringify(mi.USER_SURFACE_STRIP_KEYS)}`,
  );
}

// strip / waiting Fact unit checks
const leaked = mi.projectCapitalProviderUserSurface(
  {
    id: "u1",
    executionPlatforms: ["ebay_us", "admin"],
    expectedSellDays: 7,
    executionMode: "orchestrate",
    matchWaitersCount: 12,
    sellSuccessRate: 70,
  },
  { audience: "user" },
);
if ("executionPlatforms" in leaked) {
  fails.push("user projection leaked executionPlatforms");
}
if ("expectedSellDays" in leaked) {
  fails.push("user projection leaked expectedSellDays");
}
if ("matchWaitersCount" in leaked) {
  fails.push("unsourced matchWaitersCount must not project");
}
if (leaked.executionModeUserHint !== "AI 자동 처리") {
  fails.push("executionModeUserHint want AI 자동 처리");
}

const sourced = mi.projectWaitingFacts({
  matchWaitersCount: 2,
  matchableOpportunityCount: 4,
  factSource: "engine",
});
if (sourced.matchWaitersCount !== 2 || sourced.matchableOpportunityCount !== 4) {
  fails.push("sourced waiting Facts must expose counts");
}
const unsourced = mi.projectWaitingFacts({
  matchWaitersCount: 2,
  factSource: null,
});
if (Object.keys(unsourced).length !== 0) {
  fails.push("unsourced waiting Facts must be {}");
}

const userGuard = mi.assertUserSurfaceCapitalProvider(
  { executionPlatforms: ["ebay_us"], label: "판매 성공률" },
  { audience: "user" },
);
if (userGuard.ok) {
  fails.push("assertUserSurface must FAIL on executionPlatforms + 판매 성공률");
}
const adminGuard = mi.assertUserSurfaceCapitalProvider(
  { executionPlatforms: ["ebay_us"] },
  { audience: "admin" },
);
if (!adminGuard.ok) {
  fails.push("Admin audience may include executionPlatforms");
}

// --- copy locks (USER 표기) ---
const oppCopy = read("packages/ui/copy/ko/opportunity.ts");
const execCopy = read("packages/ui/copy/ko/execution.ts");

function lockCopy(src, key, want, file) {
  const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const m = src.match(re);
  if (!m) fails.push(`${file}: missing key ${key}`);
  else if (m[1] !== want) fails.push(`${file}: ${key} want "${want}" got "${m[1]}"`);
}

lockCopy(oppCopy, "labelPriceLow", "저가 시세", "opportunity.ts");
lockCopy(oppCopy, "labelPriceHigh", "고가 시세", "opportunity.ts");
lockCopy(oppCopy, "historicalMatchHint", "과거 유사 매칭", "opportunity.ts");
lockCopy(oppCopy, "labelAiConfidence", "AI 매칭 적합도", "opportunity.ts");
lockCopy(execCopy, "executionModeHint", "AI 자동 처리", "execution.ts");
lockCopy(execCopy, "executionModeBody", "AI가 조건을 맞춰 처리", "execution.ts");

for (const ban of [
  "구매하기",
  "판매하기",
  "입찰하기",
  "마켓 둘러보기",
  "이 상품으로 수익 벌기",
  "판매 성공률",
  "매입가",
  "판매가",
  "당첨률",
]) {
  if (oppCopy.includes(`"${ban}"`) || oppCopy.includes(`'${ban}'`)) {
    fails.push(`opportunity.ts must not contain banned value "${ban}"`);
  }
  // execution may mention 입찰 in badgeNoBid ("직접 입찰·판매 안 함") — allow negation badges only
  if (ban !== "입찰하기" && (execCopy.includes(`"${ban}"`) || execCopy.includes(`'${ban}'`))) {
    fails.push(`execution.ts must not contain banned value "${ban}"`);
  }
}
if (/ctaEarn\s*:\s*["'`]매칭 참여["'`]/.test(execCopy)) {
  fails.push("ctaEarn must not be 매칭 참여");
}

// --- Canon forbidden + PriceCompare / waiting Fact slots ---
const cardWire = JSON.parse(read("packages/ui/canon/surfaces/opportunity-card.wire.json"));
const detailWire = JSON.parse(
  read("packages/ui/canon/surfaces/opportunity-detail.wire.json"),
);
const runningWire = JSON.parse(
  read("packages/ui/canon/surfaces/execution-running.wire.json"),
);

for (const [name, wire] of [
  ["opportunity-card", cardWire],
  ["opportunity-detail", detailWire],
]) {
  const forb = wire.forbidden || [];
  for (const need of [
    "execution_platforms_user",
    "expected_sell_days",
    "sell_success_rate_user",
    "구매하기",
    "판매하기",
  ]) {
    if (!forb.includes(need)) {
      fails.push(`${name}.forbidden missing ${need}`);
    }
  }
  const blocks = wire.blocks || [];
  const low = blocks.find((b) => b.id === "priceCompareLow");
  const high = blocks.find((b) => b.id === "priceCompareHigh");
  if (low?.copyKey !== "T.opportunity.labelPriceLow" || low?.field !== "buyPriceUsdt") {
    fails.push(`${name} priceCompareLow must be labelPriceLow/buyPriceUsdt`);
  }
  if (
    high?.copyKey !== "T.opportunity.labelPriceHigh" ||
    high?.field !== "sellPriceUsdt"
  ) {
    fails.push(`${name} priceCompareHigh must be labelPriceHigh/sellPriceUsdt`);
  }
}

const runForb = runningWire.forbidden || [];
for (const need of [
  "execution_platforms_user",
  "fake_match_waiters",
  "unsourced_waiting_fact",
  "expected_sell_days",
]) {
  if (!runForb.includes(need)) {
    fails.push(`execution-running.forbidden missing ${need}`);
  }
}
const byId = Object.fromEntries((runningWire.blocks || []).map((b) => [b.id, b]));
if (byId.progressWaiters?.field !== "matchWaitersCount") {
  fails.push("execution-running progressWaiters.field must be matchWaitersCount");
}
if (byId.progressMatchable?.field !== "matchableOpportunityCount") {
  fails.push(
    "execution-running progressMatchable.field must be matchableOpportunityCount",
  );
}
if (!String(byId.progressWaiters?.when || "").includes("waitingFactSource")) {
  fails.push("progressWaiters.when must require waitingFactSource");
}
if (byId.executionModeHint?.copyKey !== "T.execution.executionModeHint") {
  fails.push("execution-running must include executionModeHint copy");
}

// --- schema description lock ---
const cardSchema = JSON.parse(read("schemas/opportunity-card.v1.json"));
const epDesc = String(cardSchema.properties?.executionPlatforms?.description ?? "");
if (!/user UI 0|유저/i.test(epDesc) && !/user UI 0/.test(epDesc)) {
  fails.push("opportunity-card.v1 executionPlatforms description must mark user UI 0");
}
if (!cardSchema.properties?.expectedSellDays) {
  fails.push("opportunity-card.v1 must keep expectedSellDays (Admin/historical)");
}

// --- Nest bridge ---
const miBridge = read("services/api-nest/src/opportunities/opportunities.mi.ts");
for (const needle of [
  "projectCapitalProviderUserSurface",
  "assertUserSurfaceCapitalProvider",
  "USER_SURFACE_STRIP_KEYS",
  "projectWaitingFacts",
]) {
  if (!miBridge.includes(needle)) {
    fails.push(`opportunities.mi.ts missing export ${needle}`);
  }
}

// --- package export ---
const miPkg = JSON.parse(read("services/market-intelligence/package.json"));
if (!miPkg.exports?.["./capital-provider-projection"]) {
  fails.push("market-intelligence must export ./capital-provider-projection");
}
const indexCjs = read("services/market-intelligence/src/index.cjs");
if (!indexCjs.includes("capital-provider-projection")) {
  fails.push("market-intelligence index.cjs must require capital-provider-projection");
}

// --- Scan user surfaces for banned trader jargon in string literals ---
// Allow: Admin apps, engine modules, verify tooling, comments documenting bans
const bannedExact = [
  ...mi.USER_BANNED_TRADER_JARGON,
  ...mi.USER_BANNED_PRIMARY_CTA.filter((x) => x !== "참여하기"), // sticky retired — scan cta keys separately
];
const uiRoots = [
  path.join(root, "packages/ui/copy/ko"),
  path.join(root, "packages/ui/components"),
  path.join(root, "apps/web"),
];
const allowRel = (rel) => {
  if (rel.includes("/admin/") || rel.startsWith("apps/admin/")) return true;
  if (rel.includes("capital-provider-projection")) return true;
  return false;
};

for (const dir of uiRoots) {
  for (const file of walkFiles(dir, [".ts", ".tsx", ".js", ".jsx"])) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (allowRel(rel)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const ban of bannedExact) {
      // only flag as copy/CTA string values, not prose comments about bans
      const asValue = new RegExp(`["'\`]${ban.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`);
      if (!asValue.test(src)) continue;
      // allow documentation that lists banned terms next to "금지"
      if (
        (src.includes("금지") || src.includes("banned") || src.includes("retired")) &&
        !new RegExp(
          `(ctaEarn|ctaSticky|ctaDetail|primaryCta|label)\\s*:\\s*["'\`]${ban.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`,
        ).test(src)
      ) {
        // still fail if it's clearly a user-facing copy value key
        const copyAssign = new RegExp(
          `:\\s*["'\`]${ban.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`,
        );
        if (copyAssign.test(src) && !/금지|banned|retired|FORBIDDEN|must not/i.test(src.split(ban)[0].slice(-80))) {
          // if nearby context (80 chars before) lacks ban docs, fail
          const idx = src.indexOf(`"${ban}"`) >= 0 ? src.indexOf(`"${ban}"`) : src.indexOf(`'${ban}'`);
          const before = src.slice(Math.max(0, idx - 100), idx);
          if (!/금지|banned|retired|FORBIDDEN|must not|forbidden/i.test(before)) {
            fails.push(`${rel}: banned trader jargon value "${ban}"`);
          }
        }
        continue;
      }
      fails.push(`${rel}: banned trader jargon value "${ban}"`);
    }
    // executionPlatforms must not be bound into user SSR props / card mappers
    if (
      /executionPlatforms\s*[:=]/.test(src) &&
      !/strip|금지|FORBIDDEN|user\s*0|user UI 0|must not/i.test(src)
    ) {
      fails.push(`${rel}: executionPlatforms must not appear on user surface code`);
    }
  }
}

// Canon wire JSON must not list executionPlatforms as a displayed field
for (const rel of [
  "packages/ui/canon/surfaces/opportunity-card.wire.json",
  "packages/ui/canon/surfaces/opportunity-detail.wire.json",
  "packages/ui/canon/surfaces/execution-running.wire.json",
]) {
  const wire = JSON.parse(read(rel));
  for (const b of wire.blocks || []) {
    if (b.field === "executionPlatforms" || b.field === "expectedSellDays") {
      fails.push(`${rel}: block must not expose field ${b.field}`);
    }
  }
}

if (fails.length) {
  console.error("[verify:user-trader-jargon-0] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:user-trader-jargon-0] PASS (INTERNAL↔USER · executionPlatforms유저0 · 대기Fact · trader jargon0)",
);
