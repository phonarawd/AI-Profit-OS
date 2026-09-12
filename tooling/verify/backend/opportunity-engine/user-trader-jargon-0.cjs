/**
 * BACKEND-ONLY PORT of tooling/verify/user-trader-jargon-0.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:user-trader-jargon-0 — Engine §4.2b · Index §20.2 · UI §48
 * 유저 surface trader 용어 0 · executionPlatforms/expectedSellDays 유저0 ·
 * 대기 Fact 소스 가드 · INTERNAL↔USER 맵 · Admin 예외
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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

mustExist("services/market-intelligence/src/capital-provider-projection.cjs");
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

if (fails.length) {
  console.error("[verify:user-trader-jargon-0] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:user-trader-jargon-0] PASS (capital-provider projection invariants · strip keys · waiting Fact · schema · Nest bridge)",
);
