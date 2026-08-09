/**
 * verify:market-partner-trust — UI §38.10 Market Partner Trust
 *
 * Scaffold + tracking gate:
 *  - Canon wire + copy + route + MarketPartner* components
 *  - 7 partner logo SVGs tracked as blocking sub-deliverable
 *  - status=ready requires file on disk
 *  - blocked logos do NOT fail this gate (explicit BLOCKER line)
 *  - Set MARKET_PARTNER_LOGOS_REQUIRE_READY=1 to hard-fail until all 7 ready
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const notes = [];

const REQUIRED_LOGOS = [
  "ebay.svg",
  "amazon.svg",
  "yahoo-jp.svg",
  "pokemontcg.svg",
  "ygoprodeck.svg",
  "coingecko.svg",
  "frankfurter.svg",
];

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

// --- files ---
const requiredFiles = [
  "packages/ui/canon/surfaces/market-partner-trust.wire.json",
  "packages/ui/brand/assets/markets/manifest.json",
  "packages/ui/brand/assets/markets/README.md",
  "packages/ui/brand/markets.ts",
  "packages/ui/copy/ko/trust.ts",
  "packages/ui/components/trust/MarketPartnerLeg.tsx",
  "packages/ui/components/trust/MarketPartnerTrustStrip.tsx",
  "packages/ui/components/trust/MarketPartnerGrid.tsx",
  "packages/ui/components/trust/index.ts",
  "apps/web/app/me/guide/partners/page.tsx",
];
for (const f of requiredFiles) mustExist(f);

// --- canon manifest registration ---
const canonManRaw = read("packages/ui/canon/manifest.json");
if (canonManRaw) {
  const man = JSON.parse(canonManRaw);
  const ids = (man.surfaces || []).map((s) => s.id);
  if (!ids.includes("market-partner-trust")) {
    fails.push("canon/manifest missing surface market-partner-trust");
  }
  if (!man.marketsManifestRef) {
    fails.push("canon/manifest missing marketsManifestRef");
  }
}

// --- wire contract ---
const wireRaw = read("packages/ui/canon/surfaces/market-partner-trust.wire.json");
let wire;
if (wireRaw) {
  try {
    wire = JSON.parse(wireRaw);
  } catch {
    fails.push("market-partner-trust.wire.json invalid JSON");
  }
}
if (wire) {
  if (wire.id !== "market-partner-trust") {
    fails.push("wire.id must be market-partner-trust");
  }
  if (wire.route !== "/me/guide/partners") {
    fails.push("wire.route must be /me/guide/partners");
  }
  const blockIds = (wire.blocks || []).map((b) => b.id);
  for (const need of [
    "trustStrip",
    "partnerLeg",
    "partnerGrid",
    "orchestrateTruth",
    "successLegLog",
  ]) {
    if (!blockIds.includes(need)) fails.push(`wire.blocks missing ${need}`);
  }
  const forb = wire.forbidden || [];
  for (const need of [
    "시세_참고용만_sole_trust",
    "공식_대리_구매",
    "yahoo_jp_label_ban",
    "render_blocked_logo",
    "판매_완료_leg_copy",
  ]) {
    if (!forb.includes(need)) fails.push(`wire.forbidden missing ${need}`);
  }
  const blocking = wire.blockingSubDeliverable;
  if (!blocking || blocking.id !== "market-partner-logo-svgs") {
    fails.push("wire.blockingSubDeliverable.id must be market-partner-logo-svgs");
  }
  const assets = blocking?.assets || [];
  for (const f of REQUIRED_LOGOS) {
    if (!assets.includes(f)) {
      fails.push(`wire.blockingSubDeliverable.assets missing ${f}`);
    }
  }
  if (wire.adminPointer?.route !== "/admin/growth?tab=partners") {
    fails.push("wire.adminPointer.route must be /admin/growth?tab=partners");
  }
}

// --- opportunity / execution leg slots + orchestrate coexistence ---
for (const [rel, needId] of [
  ["packages/ui/canon/surfaces/opportunity-card.wire.json", "partnerLeg"],
  ["packages/ui/canon/surfaces/opportunity-detail.wire.json", "partnerLeg"],
  ["packages/ui/canon/surfaces/execution-running.wire.json", "partnerLeg"],
  ["packages/ui/canon/surfaces/execution-success.wire.json", "successLegLog"],
]) {
  const raw = read(rel);
  if (!raw) continue;
  const w = JSON.parse(raw);
  const ids = (w.blocks || []).map((b) => b.id);
  if (!ids.includes(needId)) fails.push(`${rel} missing block ${needId}`);
  if (rel.includes("opportunity-card") || rel.includes("opportunity-detail")) {
    const keys = (w.blocks || []).map((b) => b.copyKey);
    if (!keys.includes("T.execution.badgeNoBuy") || !keys.includes("T.execution.badgeNoSell")) {
      fails.push(`${rel} must keep orchestrate badges with partner leg`);
    }
  }
}

// --- copy locks ---
const trustSrc = read("packages/ui/copy/ko/trust.ts");
if (trustSrc) {
  const locks = {
    stripHeadline: "🤝 공식 협력 · 글로벌 시세·데이터 연동",
    stripSub: "대형 쇼핑몰·도소매 시장과 연동해 시세를 가져와요",
    legFootnote: "공식 협력 · 시세·데이터 연동",
    successLegLog: "{buyLabel} ↔ {sellLabel} 시세 반영",
  };
  for (const [key, want] of Object.entries(locks)) {
    const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
    const m = trustSrc.match(re);
    if (!m) fails.push(`trust.ts missing ${key}`);
    else if (m[1] !== want) fails.push(`trust.ts ${key} want "${want}" got "${m[1]}"`);
  }
  const stringLits = [...trustSrc.matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  const joined = stringLits.join("\n");
  if (joined.includes("시세 참고용만")) {
    fails.push("trust.ts must not use 시세 참고용만 as partner trust copy");
  }
  if (/공식 대리 구매|공식 대리 판매/.test(joined)) {
    fails.push("trust.ts must not claim 공식 대리 구매/판매");
  }
  if (joined.includes("판매 완료")) {
    fails.push("trust.ts must not use 판매 완료 leg copy");
  }
}

const copyIndex = read("packages/ui/copy/ko/index.ts");
if (copyIndex && !/from ["']\.\/trust["']/.test(copyIndex)) {
  fails.push("copy/ko/index.ts must import trust");
}
if (copyIndex && !/^\s*trust,/m.test(copyIndex)) {
  fails.push("copy/ko/index.ts must export trust on T");
}

// --- routes lock ---
const routesSrc = read("apps/web/routes.ts");
if (routesSrc && !routesSrc.includes('"/me/guide/partners"')) {
  fails.push('apps/web/routes.ts must lock "/me/guide/partners"');
}

// --- markets manifest tracking (blocking sub-deliverable) ---
const marketsRaw = read("packages/ui/brand/assets/markets/manifest.json");
let markets;
if (marketsRaw) {
  try {
    markets = JSON.parse(marketsRaw);
  } catch {
    fails.push("markets/manifest.json invalid JSON");
  }
}

const brandRoot = path.join(root, "packages/ui/brand");
const blockedFiles = [];
const readyMissing = [];

if (markets) {
  if (!markets.blockingSubDeliverable || markets.blockingSubDeliverable.id !== "market-partner-logo-svgs") {
    fails.push("markets/manifest.blockingSubDeliverable.id must be market-partner-logo-svgs");
  }
  const logos = markets.logos || [];
  if (logos.length !== 7) fails.push(`markets/manifest logos must be 7 (got ${logos.length})`);
  const byFile = new Map(logos.map((l) => [l.file, l]));
  for (const f of REQUIRED_LOGOS) {
    const entry = byFile.get(f);
    if (!entry) {
      fails.push(`markets/manifest missing tracked logo ${f}`);
      continue;
    }
    if (entry.status !== "blocked" && entry.status !== "ready") {
      fails.push(`${f} status must be blocked|ready (got ${entry.status})`);
    }
    const abs = path.join(brandRoot, entry.path || `assets/markets/${f}`);
    if (entry.status === "ready") {
      if (!fs.existsSync(abs)) readyMissing.push(f);
      else if (fs.statSync(abs).size < 32) fails.push(`${f} ready but file too small`);
    } else {
      blockedFiles.push(f);
      // Invented placeholder SVGs are forbidden while blocked — file may be absent.
      if (fs.existsSync(abs)) {
        notes.push(`WARN ${f} status=blocked but file exists — confirm official mark before status=ready`);
      }
    }
  }
  // yahoo + amazon must be tracked (표기 필수 · adapter Day-1≠표기)
  for (const id of ["yahoo-jp", "amazon", "ebay"]) {
    if (!logos.some((l) => l.id === id)) fails.push(`markets/manifest missing logo id ${id}`);
  }
  const tierA = logos.filter((l) => l.tier === "A");
  if (tierA.length < 3) fails.push("markets Tier-A logos must cover ebay/amazon/yahoo-jp (≥3 ids)");
}

for (const f of readyMissing) {
  fails.push(`logo status=ready but file missing: ${f}`);
}

// --- TS mirror sync (markets.ts ↔ manifest.json) ---
const marketsTs = read("packages/ui/brand/markets.ts");
if (marketsTs && markets) {
  for (const f of REQUIRED_LOGOS) {
    if (!marketsTs.includes(`file: "${f}"`)) {
      fails.push(`brand/markets.ts missing file: "${f}" (must mirror manifest)`);
    }
  }
  for (const logo of markets.logos || []) {
    const re = new RegExp(
      `file:\\s*"${logo.file.replace(".", "\\.")}"[\\s\\S]*?status:\\s*"(blocked|ready)"`,
    );
    const m = marketsTs.match(re);
    if (!m) fails.push(`brand/markets.ts status sync failed for ${logo.file}`);
    else if (m[1] !== logo.status) {
      fails.push(
        `brand/markets.ts status for ${logo.file} want ${logo.status} got ${m[1]}`,
      );
    }
  }
}

// --- registry logoAsset pointers ---
const registryRaw = read("schemas/market-partner.registry.json");
if (registryRaw) {
  const registry = JSON.parse(registryRaw);
  const logoAssets = new Set(
    (registry.partners || []).map((p) => p.logoAsset).filter(Boolean),
  );
  for (const f of REQUIRED_LOGOS) {
    if (!logoAssets.has(f)) {
      fails.push(`market-partner.registry.json missing logoAsset ${f}`);
    }
  }
}

// --- brand.manifest pointer ---
const brandManRaw = read("packages/ui/brand/brand.manifest.json");
if (brandManRaw) {
  const bm = JSON.parse(brandManRaw);
  if (!bm.marketPartners?.manifest) {
    fails.push("brand.manifest.json missing marketPartners.manifest pointer");
  }
  if (bm.marketPartners?.blockingSubDeliverable !== "market-partner-logo-svgs") {
    fails.push("brand.manifest.marketPartners.blockingSubDeliverable must be market-partner-logo-svgs");
  }
}

const requireReady = process.env.MARKET_PARTNER_LOGOS_REQUIRE_READY === "1";
if (requireReady && blockedFiles.length) {
  fails.push(
    `MARKET_PARTNER_LOGOS_REQUIRE_READY=1 but still blocked: ${blockedFiles.join(", ")}`,
  );
}

if (fails.length) {
  console.error("[verify:market-partner-trust] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

if (blockedFiles.length) {
  console.log(
    `[verify:market-partner-trust] PASS (scaffold) · BLOCKER market-partner-logo-svgs still blocked: ${blockedFiles.join(", ")}`,
  );
} else {
  console.log(
    "[verify:market-partner-trust] PASS (scaffold + all 7 market logos ready)",
  );
}
for (const n of notes) console.log(`[verify:market-partner-trust] ${n}`);
