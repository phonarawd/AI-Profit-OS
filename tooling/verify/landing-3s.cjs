/**
 * verify:landing-3s — UI §6.4c PART2c · Infra §31.2a/b · §6.4c.1 v7.22.55
 * Canon landing-3s · firstViewport≤5 · Tier-A strip · /l/* + /ads identical
 * Primary CTA = navigate /onboarding · Kakao 직행 0 · utility keys · 금지어 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing ${rel}`);
}

const files = [
  "packages/ui/canon/surfaces/landing-3s.wire.json",
  "packages/ui/copy/ko/landing.ts",
  "packages/ui/components/landing/Landing3s.tsx",
  "packages/ui/components/landing/index.ts",
  "apps/web/app/l/[variant]/page.tsx",
  "apps/web/app/ads/page.tsx",
  "apps/web/app/ads/[variant]/page.tsx",
];
for (const f of files) mustExist(f);

const wireRaw = read("packages/ui/canon/surfaces/landing-3s.wire.json");
let wire;
if (wireRaw) {
  try {
    wire = JSON.parse(wireRaw);
  } catch {
    fails.push("landing-3s.wire.json invalid JSON");
  }
}
if (wire) {
  if (wire.id !== "landing-3s") fails.push("wire.id must be landing-3s");
  if (wire.route !== "/l/[variant]") fails.push("wire.route must be /l/[variant]");
  if (wire.firstViewportMaxBlocks !== 5) {
    fails.push("wire.firstViewportMaxBlocks must be 5");
  }
  const blocks = wire.blocks || [];
  if (blocks.length > 5) {
    fails.push(`wire.blocks length ${blocks.length} exceeds firstViewportMaxBlocks=5`);
  }
  const ids = blocks.map((b) => b.id);
  for (const need of ["brand", "headline", "reassure", "cta", "trust"]) {
    if (!ids.includes(need)) fails.push(`wire.blocks missing ${need}`);
  }
  const aliases = wire.aliases || [];
  if (!aliases.includes("/ads") || !aliases.includes("/ads/[variant]")) {
    fails.push("wire.aliases must include /ads and /ads/[variant]");
  }
  for (const f of [
    "stat_strip",
    "schedule_block",
    "multi_card_hero",
    "profit_guaranteed_cta",
    "gender_branch",
    "photo_pixel_match",
    "kakao_oauth_primary_on_landing",
    "expectedNotGuaranteed_on_landing",
  ]) {
    if (!(wire.forbidden || []).includes(f)) {
      fails.push(`wire.forbidden missing ${f}`);
    }
  }
  if (wire.primaryCta?.action !== "navigate") {
    fails.push("landing primaryCta.action must be navigate (Kakao 직행 폐기)");
  }
  if (wire.primaryCta?.href !== "/onboarding") {
    fails.push("landing primaryCta.href must be /onboarding");
  }
  if (wire.primaryCta?.copyKey !== "T.landing.ctaOpenPriceMap") {
    fails.push("landing primaryCta.copyKey must be T.landing.ctaOpenPriceMap");
  }
}

const landing = read("packages/ui/components/landing/Landing3s.tsx");
if (landing) {
  if (!landing.includes("data-first-viewport-max")) {
    fails.push("Landing3s must declare data-first-viewport-max");
  }
  for (const block of ["brand", "headline", "reassure", "cta", "trust"]) {
    if (!landing.includes(`data-landing-block="${block}"`)) {
      fails.push(`Landing3s missing data-landing-block=${block}`);
    }
  }
  if (!landing.includes("MarketPartnerTrustStrip")) {
    fails.push("Landing3s must include MarketPartnerTrustStrip (Tier-A)");
  }
  if (!landing.includes("ctaOpenPriceMap")) {
    fails.push("Landing3s must use T.landing.ctaOpenPriceMap");
  }
  if (!landing.includes("utilityDisclaimer")) {
    fails.push("Landing3s must use T.landing.utilityDisclaimer");
  }
  if (!landing.includes("/onboarding")) {
    fails.push("Landing3s CTA must navigate to /onboarding");
  }
  if (
    landing.includes("kakaoStartHref") ||
    landing.includes("isKakaoOAuthReady") ||
    landing.includes("data-oauth=\"kakao\"")
  ) {
    fails.push("Landing3s must not use Kakao as primary CTA (§6.4c.1 B)");
  }
  if (/stat.?strip|schedule_block|multi_card/i.test(landing)) {
    fails.push("Landing3s must not include forbidden firstViewport patterns");
  }
  if (landing.includes("expectedNotGuaranteed")) {
    fails.push("Landing3s must not use expectedNotGuaranteed on landing");
  }
}

const ads = read("apps/web/app/ads/page.tsx");
const adsVar = read("apps/web/app/ads/[variant]/page.tsx");
const lVar = read("apps/web/app/l/[variant]/page.tsx");
if (ads && !ads.includes("Landing3s")) {
  fails.push("/ads must render Landing3s (identical surface)");
}
if (adsVar && !adsVar.includes("Landing3s")) {
  fails.push("/ads/[variant] must render Landing3s");
}
if (lVar && !lVar.includes("Landing3s")) {
  fails.push("/l/[variant] must render Landing3s");
}

const nextCfg = read("apps/web/next.config.ts");
if (nextCfg) {
  if (!nextCfg.includes("/ads") || !nextCfg.includes("/l/")) {
    fails.push("next.config must rewrite /ads → /l (Infra §31.2a)");
  }
}

const BANNED =
  /수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바/;
const copy = read("packages/ui/copy/ko/landing.ts");
if (copy) {
  for (const k of [
    "identityOneLiner",
    "utilityDisclaimer",
    "transitionDisclosure",
    "ctaOpenPriceMap",
    "ctaStartUtility",
    "ctaContinueUtility",
  ]) {
    if (!copy.includes(`${k}:`)) fails.push(`landing.ts missing ${k}`);
  }
  if (copy.includes("expectedNotGuaranteed")) {
    fails.push("landing.ts must not export expectedNotGuaranteed (앱 T.trust only)");
  }
  // strip comments before ban scan
  const body = copy
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  if (BANNED.test(body)) {
    fails.push(
      "landing.ts contains banned utility words (수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바)",
    );
  }
}

const man = read("packages/ui/canon/manifest.json");
if (man && !man.includes("landing-3s")) {
  fails.push("canon/manifest missing landing-3s");
}

if (fails.length) {
  console.error("[verify:landing-3s] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:landing-3s] PASS (utility CTA→/onboarding · 금지어0 · Tier-A · /l+/ads identical)",
);
