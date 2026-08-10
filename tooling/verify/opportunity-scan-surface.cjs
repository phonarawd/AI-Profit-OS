/**
 * verify:opportunity-scan-surface — UI §5.3b
 * 홈 3초 위계 · arbitrageTypeKo · PartnerTrustStrip/Leg · 카드 3단
 * CTA 라벨 잠금은 verify:cta-earn-profit (다음 todo) Owns
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
  "packages/ui/components/opportunity/OpportunityCard.tsx",
  "packages/ui/components/opportunity/OpportunityScanBadge.tsx",
  "packages/ui/components/opportunity/BalanceAwareHome.tsx",
  "packages/ui/components/opportunity/CategoryFilterChips.tsx",
  "packages/ui/components/opportunity/index.ts",
  "packages/ui/copy/ko/feed.ts",
  "packages/ui/copy/ko/opportunity.ts",
  "packages/ui/canon/surfaces/opportunity-card.wire.json",
  "packages/ui/components/trust/MarketPartnerTrustStrip.tsx",
  "packages/ui/components/trust/MarketPartnerLeg.tsx",
  "apps/web/app/page.tsx",
  "apps/web/app/profits/page.tsx",
];
for (const f of files) mustExist(f);

const feed = read("packages/ui/copy/ko/feed.ts");
for (const key of ["homeTitle", "homeScanSub", "chipTimeSensitive"]) {
  if (!feed.includes(`${key}:`)) fails.push(`feed.ts missing ${key}`);
}
if (!feed.includes("오늘 벌 수 있는 기회")) {
  fails.push("feed.homeTitle must lock 오늘 벌 수 있는 기회");
}
if (!feed.includes("AI가 지금 시장을 스캔했어요")) {
  fails.push("feed.homeScanSub must lock AI가 지금 시장을 스캔했어요");
}

const card = read("packages/ui/components/opportunity/OpportunityCard.tsx");
for (const needle of [
  "arbitrageTypeKo",
  "OpportunityScanBadge",
  "MarketPartnerLeg",
  "labelRequiredCapital",
  "labelExpectedProfit",
  "labelAiConfidence",
  "badgeMatchable",
  "badgeNoBuy",
  "badgeNoSell",
  "disclaimerResult",
  "data-testid=\"opportunity-card\"",
  "ProductImage",
]) {
  if (!card.includes(needle)) {
    fails.push(`OpportunityCard missing ${needle}`);
  }
}
// 위계: 기회(badge/corridor) → 투입 → 수익 → AI → CTA 슬롯 존재
if (!card.includes("corridor")) {
  fails.push("OpportunityCard must render corridor (회랑)");
}
// expectedSellDays / executionPlatforms 유저 0
if (/expectedSellDays/.test(card) && !/금지|0|FORBIDDEN/.test(card)) {
  fails.push("OpportunityCard must not bind expectedSellDays");
}
if (/executionPlatforms/.test(card) && !/금지|0|FORBIDDEN/.test(card)) {
  fails.push("OpportunityCard must not bind executionPlatforms");
}

const badge = read(
  "packages/ui/components/opportunity/OpportunityScanBadge.tsx",
);
if (!badge.includes("arbitrageTypeKo")) {
  fails.push("OpportunityScanBadge must display arbitrageTypeKo field");
}
if (!badge.includes('data-field="arbitrageTypeKo"')) {
  fails.push("OpportunityScanBadge must mark data-field=arbitrageTypeKo");
}

const home = read("packages/ui/components/opportunity/BalanceAwareHome.tsx");
for (const needle of [
  "MarketPartnerTrustStrip",
  "homeTitle",
  "homeScanSub",
  "CategoryFilterChips",
  "OpportunityCard",
  'data-home-slot="scanHero"',
  'data-home-slot="partnerTrust"',
]) {
  if (!home.includes(needle)) {
    fails.push(`BalanceAwareHome missing ${needle}`);
  }
}

/** PART9c — BalanceAwareHome may mount in HomePageClient */
let page = read("apps/web/app/page.tsx");
for (const rel of [
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/_components/HomePageClient.tsx",
  "apps/web/components/HomePageClient.tsx",
]) {
  if (fs.existsSync(path.join(root, rel))) {
    page = `${page}\n${read(rel)}`;
    break;
  }
}
const experience = read("packages/ui/components/home/HomeExperience.tsx");
const mountsHomeOpp =
  page.includes("BalanceAwareHome") ||
  (page.includes("HomeExperience") && experience.includes("BalanceAwareHome"));
if (!mountsHomeOpp) {
  fails.push(
    "apps/web home must mount BalanceAwareHome (direct or via HomeExperience)",
  );
}

const profitsPage = read("apps/web/app/profits/page.tsx");
const profitsClient = fs.existsSync(
  path.join(root, "apps/web/app/profits/ProfitsPageClient.tsx"),
)
  ? read("apps/web/app/profits/ProfitsPageClient.tsx")
  : "";
const profits = `${profitsPage}\n${profitsClient}`;
if (
  !(
    profits.includes("OpportunityCard") ||
    profits.includes("VirtualOpportunityList")
  ) ||
  !profits.includes("CategoryFilterChips")
) {
  fails.push("/profits must use OpportunityCard + CategoryFilterChips");
}

const wire = JSON.parse(read("packages/ui/canon/surfaces/opportunity-card.wire.json"));
const hierarchy = wire.cardHierarchy || [];
for (const need of [
  "opportunity",
  "requiredCapital",
  "expectedProfit",
  "aiConfidence",
  "ctaEarn",
]) {
  if (!hierarchy.includes(need)) {
    fails.push(`opportunity-card.wire cardHierarchy missing ${need}`);
  }
}
const blocks = wire.blocks || [];
if (!blocks.some((b) => b.field === "arbitrageTypeKo" && b.role === "badge")) {
  fails.push("opportunity-card.wire must badge arbitrageTypeKo");
}
if (!blocks.some((b) => b.component === "MarketPartnerLeg")) {
  fails.push("opportunity-card.wire must include MarketPartnerLeg");
}

const pkg = read("packages/ui/package.json");
if (!pkg.includes("./components/opportunity")) {
  fails.push("packages/ui package.json must export ./components/opportunity");
}

const copyIdx = read("packages/ui/copy/ko/index.ts");
if (!copyIdx.includes("feed")) {
  fails.push("T root must export feed");
}

const rootPkg = read("package.json");
if (!rootPkg.includes('"verify:opportunity-scan-surface"')) {
  fails.push("package.json missing verify:opportunity-scan-surface script");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("opportunity-scan-surface")) {
  fails.push("CATALOG.md must list opportunity-scan-surface");
}

if (fails.length) {
  console.error(
    "[verify:opportunity-scan-surface] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:opportunity-scan-surface] PASS (§5.3b 홈위계·arbitrageTypeKo·PartnerTrustStrip/Leg)",
);
