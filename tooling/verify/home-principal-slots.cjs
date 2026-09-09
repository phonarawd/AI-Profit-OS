/**
 * verify:home-principal-slots - UI PART9d
 * Home must show a real principal-like balance with no fabricated amounts and
 * no exposed success-rate metric.
 *
 * REWRITTEN 2026-09-04 (verify migration session): dropped requirements on
 * the dead packages/ui/components/opportunity/HomePrincipalRail.tsx /
 * BalanceAwareHome.tsx and on the copy library keys they consumed
 * (T.feed.balanceLabel etc, which the live Spark Dash Home does not
 * reference - see governance/runtime-surfaces.v1.json surfaces.home). Kept:
 * the Canon wire.json's own internal shape (harmless documentation
 * consistency check, independent of which UI is live) and the two
 * anti-pattern guards, now checked against the live client.
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

mustExist("packages/ui/canon/surfaces/home-principal-slots.wire.json");
const wire = read("packages/ui/canon/surfaces/home-principal-slots.wire.json");
const manifest = read("packages/ui/canon/manifest.json");

try {
  const w = JSON.parse(wire || "{}");
  if (w.id !== "home-principal-slots") {
    fails.push("wire id must be home-principal-slots");
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

// --- live Home: real balance shown, no fabricated amounts, no success rate ---
let registry;
try {
  registry = JSON.parse(read("governance/runtime-surfaces.v1.json") || "{}");
} catch {
  registry = { surfaces: {} };
}
const homeSurface = registry.surfaces?.home || {};
const homeClientRel = homeSurface.client || "apps/web/app/HomeDesktopClient.tsx";
const homeClient = read(homeClientRel);
const mapperRel = homeSurface.mapper || "apps/web/components/spark-dash-home/map-runtime.ts";
const mapper = read(mapperRel);
const presentationSrc = (homeSurface.presentation || [])
  .map((p) => read(p))
  .join("\n");
const liveHomeSrc = `${homeClient}\n${mapper}\n${presentationSrc}`;

if (!mapper.includes("principalUsdt") && !presentationSrc.includes("principalUsdt")) {
  fails.push(`live Home mapper/presentation must surface principalUsdt`);
}
if (/successRatePercent/.test(liveHomeSrc) || /\uc131\uacf5\ub960/.test(liveHomeSrc)) {
  fails.push("live Home must not surface success rate");
}
if (/Math\.random|mockKrw|\uac00\uc9dc.*\u20a9\d/.test(liveHomeSrc)) {
  fails.push("live Home must not use fake/random KRW amounts");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:home-principal-slots"')) {
  fails.push("package.json missing verify:home-principal-slots");
}

if (fails.length) {
  console.error("[verify:home-principal-slots] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:home-principal-slots] PASS (wire shape · live balance surfaced · no fake amounts/success-rate)",
);
