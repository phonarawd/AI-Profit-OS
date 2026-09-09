/**
 * REL-404 Lighthouse 동등 게이트.
 * 로컬/기본 CI = 예산 파일 + image/lazy 배선 + Home lock.
 * 풀 Lighthouse 바이너리는 이 REL에서 설치하지 않는다.
 */
const fs = require("fs");
const path = require("path");

const SPEC_REL = "governance/performance/budgets.v1.json";
const root = path.resolve(__dirname, "../..");

function loadSpec() {
  return JSON.parse(fs.readFileSync(path.join(root, SPEC_REL), "utf8"));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function staticBudgetAudit() {
  const fails = [];
  const spec = loadSpec();
  if (spec.rel !== "REL-404") fails.push("spec.rel must be REL-404");
  if (spec.localFullLighthouse !== false) fails.push("localFullLighthouse must be false");
  if (spec.numericSloInvented !== false) fails.push("do not invent numeric SLOs");
  if (spec.homeVisualDowngrade !== false) fails.push("homeVisualDowngrade must be false");
  if (spec.homeGeometryRewrite !== "FORBIDDEN") {
    fails.push("home geometry rewrite must stay FORBIDDEN");
  }
  for (const id of ["bundle", "image", "lazy"]) {
    if (!spec.budgets || !spec.budgets[id]) fails.push("budget missing " + id);
  }

  const freeze = JSON.parse(read(spec.homeFreeze));
  if (freeze.verdict && freeze.verdict.homePresentationBaseline !== "LOCKED") {
    fails.push("Home presentation baseline must stay LOCKED");
  }
  if (!freeze.lock || freeze.lock.doNotModifyHomeVisualUnlessReopened !== true) {
    fails.push("Home freeze must keep doNotModifyHomeVisualUnlessReopened");
  }

  const geo = JSON.parse(read(spec.homeGeometryLock));
  if (geo.rewrite !== "FORBIDDEN") fails.push("home-geometry-lock rewrite must be FORBIDDEN");

  const product = read("packages/ui/components/product/ProductImage.tsx");
  if (!product.includes('loading={priority ? undefined : "lazy"}')) {
    fails.push("ProductImage must lazy-load when not priority");
  }
  if (!product.includes("productImageSizes") && !product.includes("sizes=")) {
    fails.push("ProductImage must set sizes");
  }

  // NOTE (2026-09-04): packages/ui/components/home/HomeHeroIllustration.tsx
  // (raster-image hero, AVIF/WebP <picture> sources) is deleted - dead,
  // unreachable, part of the Owner-decided-retired Canon Home tree. The
  // live Spark Dash hero (apps/web/components/spark-dash-home/HomeDesktop.tsx
  // + HomeMobile.tsx) uses SVG <img> assets instead (SD_ASSETS.heroHalo /
  // heroLightningOutline / opportunityEnergy / energyStreaks) - AVIF/WebP
  // does not apply to vector assets. The real perf intent (hero loads
  // eagerly, not deferred) is preserved by checking for the absence of
  // loading="lazy" on the live hero markup instead.
  const heroDesktop = read("apps/web/components/spark-dash-home/HomeDesktop.tsx");
  const heroMobile = read("apps/web/components/spark-dash-home/HomeMobile.tsx");
  if (/loading=\{?["']lazy["']\}?/.test(heroDesktop + heroMobile)) {
    fails.push("Home hero images must not be marked lazy (above the fold)");
  }

  const ppe = read("packages/ui/performance/README.md");
  if (!ppe.includes("PREMIUM VISUAL QUALITY")) {
    fails.push("PPE readme must keep premium visual lock");
  }
  if (!ppe.includes("VISUAL_PERFORMANCE_CONFLICT")) {
    fails.push("PPE must keep VISUAL_PERFORMANCE_CONFLICT");
  }

  return { ok: fails.length === 0, fails, delegated: true, spec };
}

if (require.main === module) {
  if (process.env.AIPO_LIGHTHOUSE === "1" || process.env.AIPO_LIGHTHOUSE === "true") {
    console.log(
      "[lighthouse.ci] AIPO_LIGHTHOUSE is reserved — binary not installed in REL-404. static equivalent only.",
    );
  }
  const result = staticBudgetAudit();
  if (!result.ok) {
    console.error("[lighthouse.ci] FAIL");
    for (const f of result.fails) console.error(" -", f);
    process.exit(1);
  }
  console.log("[lighthouse.ci] PASS (static budget · Lighthouse CI-delegated)");
}

module.exports = { SPEC_REL, loadSpec, staticBudgetAudit };
