/**
 * verify:home-principal-slots — UI PART9d
 * §5.3 B/D HomePrincipalRail + Canon + pd-feed-grid
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

mustExist("packages/ui/components/opportunity/HomePrincipalRail.tsx");
mustExist("packages/ui/canon/surfaces/home-principal-slots.wire.json");
mustExist("packages/ui/responsive/container.css");

const rail = read("packages/ui/components/opportunity/HomePrincipalRail.tsx");
const wire = read("packages/ui/canon/surfaces/home-principal-slots.wire.json");
const feedCopy = read("packages/ui/copy/ko/feed.ts");
const homeIdx = read("packages/ui/components/opportunity/index.ts");
const balHome = read("packages/ui/components/opportunity/BalanceAwareHome.tsx");
const containerCss = read("packages/ui/responsive/container.css");
const manifest = read("packages/ui/canon/manifest.json");
const pkg = read("packages/ui/package.json");

let clientSrc = "";
for (const rel of [
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/_components/HomePageClient.tsx",
  "apps/web/components/HomePageClient.tsx",
]) {
  if (fs.existsSync(path.join(root, rel))) {
    clientSrc = read(rel);
    break;
  }
}
if (!clientSrc) fails.push("missing HomePageClient (PART9c/9d)");

// --- Canon ---
try {
  const w = JSON.parse(wire || "{}");
  if (w.id !== "home-principal-slots") {
    fails.push("wire id must be home-principal-slots");
  }
  if (w.route !== "/") fails.push("wire route must be /");
  if (w.layoutClass !== "home-money-grid") {
    fails.push("wire layoutClass must be home-money-grid (v1.3 · pd-feed-grid 공유 분리)");
  }
  if (!Array.isArray(w.blocks) || w.blocks.length < 2) {
    fails.push("wire blocks[] must include B/D metrics");
  }
  const blockIds = (w.blocks || []).map((b) => b.id);
  for (const id of ["principalBalance", "todayPossibleProfit"]) {
    if (!blockIds.includes(id)) fails.push(`wire missing block ${id}`);
  }
  if (!Array.isArray(w.forbidden) || !w.forbidden.includes("photo_pixel_match")) {
    fails.push("wire forbidden must include photo_pixel_match");
  }
} catch {
  fails.push("home-principal-slots.wire.json invalid JSON");
}

if (!manifest.includes('"home-principal-slots"')) {
  fails.push("canon manifest must register home-principal-slots");
}

// --- Component contract ---
for (const needle of [
  "HomePrincipalRail",
  'data-home-slot="principal-balance"',
  'data-home-slot="today-possible-profit"',
  "home-money-grid",
  "principalUsdt",
  "todayPossibleProfitUsdt",
  "T.feed.balanceLabel",
  "T.feed.todayPossibleProfitLabel",
]) {
  if (!rail.includes(needle)) {
    fails.push(`HomePrincipalRail missing: ${needle}`);
  }
}

if (!homeIdx.includes("HomePrincipalRail")) {
  fails.push("opportunity/index must export HomePrincipalRail");
}
if (!pkg.includes("HomePrincipalRail")) {
  fails.push("@aipo/ui package.json must export HomePrincipalRail");
}

for (const key of [
  "balanceLabel",
  "balanceKrwApprox",
  "balanceUsdtPrimary",
  "todayPossibleProfitLabel",
  "todayPossibleProfitUsdt",
  "ctaDeposit",
]) {
  if (!feedCopy.includes(key)) {
    fails.push(`T.feed missing ${key}`);
  }
}

if (!containerCss.includes(".pd-feed-grid")) {
  fails.push("container.css must define .pd-feed-grid");
}

// --- Home wire (HomeExperience presentation · PART9 data keep) ---
const experienceSrc = read("packages/ui/components/home/HomeExperience.tsx");
const mountsRail =
  clientSrc.includes("HomePrincipalRail") ||
  (clientSrc.includes("HomeExperience") &&
    experienceSrc.includes("HomePrincipalRail"));
if (!mountsRail) {
  fails.push("Home must mount HomePrincipalRail (via HomePageClient or HomeExperience)");
}
if (!clientSrc.includes("principalUsdt")) {
  fails.push("HomePageClient must pass principalUsdt from feed");
}
if (!clientSrc.includes("todayPossibleProfitUsdt")) {
  fails.push("HomePageClient must pass todayPossibleProfitUsdt");
}

// opportunity list uses home-opportunity-grid (PART9d · v1.3 pd-feed-grid 공유 분리)
if (!balHome.includes("home-opportunity-grid")) {
  fails.push("BalanceAwareHome affordable list must use home-opportunity-grid");
}

// anti-patterns
if (/successRatePercent/.test(rail) || /성공률/.test(rail)) {
  fails.push("HomePrincipalRail must not surface success rate");
}
if (/Math\.random|가짜|mockKrw|하드코딩.*₩15/.test(rail + clientSrc)) {
  fails.push("no fake KRW/random amounts in principal rail wire");
}

if (fails.length) {
  console.error("[verify:home-principal-slots] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:home-principal-slots] PASS (HomePrincipalRail · Canon · home-money-grid)",
);
