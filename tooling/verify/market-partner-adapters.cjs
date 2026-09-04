/**
 * verify:market-partner-adapters — Engine §0.0.1c (v7.22.41)
 * A: amazon leg adapter
 * B: yahoo_jp official partner adapter
 * C: partner registry schema + MI SSOT
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

// --- C: partner registry schema + instance ---
mustExist("schemas/market-partner.v1.json");
mustExist("schemas/market-partner.registry.json");
mustExist("services/market-intelligence/src/market-partners.cjs");

const schemaRaw = read("schemas/market-partner.v1.json");
const registryRaw = read("schemas/market-partner.registry.json");
let schema;
let registry;
if (schemaRaw) {
  try {
    schema = JSON.parse(schemaRaw);
  } catch {
    fails.push("market-partner.v1.json invalid JSON");
  }
}
if (registryRaw) {
  try {
    registry = JSON.parse(registryRaw);
  } catch {
    fails.push("market-partner.registry.json invalid JSON");
  }
}

if (schema) {
  if (schema.title !== "MarketPartnerRegistryV1") {
    fails.push("schema title must be MarketPartnerRegistryV1");
  }
  if (!/0\.0\.1c|Market Partner Registry/i.test(schema.description || "")) {
    fails.push("schema description must cite §0.0.1c");
  }
}

if (registry) {
  if (registry.version !== 1) fails.push("registry.version must be 1");
  if (!Array.isArray(registry.partners) || registry.partners.length < 8) {
    fails.push("registry.partners must have ≥8 entries");
  }
  const byId = new Map();
  for (const p of registry.partners || []) {
    byId.set(p.partnerId, p);
    if (p.officialPartner !== true) {
      fails.push(`${p.partnerId} officialPartner must be true`);
    }
  }
  for (const id of [
    "ebay_us",
    "ebay_gb",
    "ebay_de",
    "ebay_au",
    "amazon_us",
    "amazon_jp",
    "amazon_de",
    "yahoo_jp",
  ]) {
    const p = byId.get(id);
    if (!p) {
      fails.push(`registry missing Tier-A partner ${id}`);
      continue;
    }
    if (p.tier !== "A") fails.push(`${id} tier must be A`);
    if (p.uiTrustStrip !== "always") fails.push(`${id} uiTrustStrip must be always`);
  }
  for (const id of ["amazon_us", "amazon_jp", "amazon_de", "yahoo_jp"]) {
    if (byId.get(id)?.listingLegPhase !== "Phase1+") {
      fails.push(`${id} listingLegPhase must be Phase1+`);
    }
  }
  for (const id of ["ebay_us", "ebay_gb"]) {
    if (byId.get(id)?.listingLegPhase !== "Day-1") {
      fails.push(`${id} listingLegPhase must be Day-1`);
    }
  }
  if (byId.get("amazon_us")?.adapterId !== "amazon") {
    fails.push("amazon_* adapterId must be amazon");
  }
  if (byId.get("yahoo_jp")?.adapterId !== "yahoo_jp") {
    fails.push("yahoo_jp adapterId must be yahoo_jp");
  }
}

// --- MI SSOT ---
const partners = require(path.join(
  root,
  "services/market-intelligence/src/market-partners.cjs",
));
for (const id of ["amazon", "yahoo_jp"]) {
  if (!partners.PARTNER_LISTING_ADAPTER_IDS.includes(id)) {
    fails.push(`PARTNER_LISTING_ADAPTER_IDS missing ${id}`);
  }
}
for (const id of ["amazon_us", "amazon_jp", "amazon_de", "yahoo_jp"]) {
  if (!partners.PARTNER_MARKET_IDS.includes(id)) {
    fails.push(`PARTNER_MARKET_IDS missing ${id}`);
  }
}
const strip = partners.tierATrustStripPartners();
if (strip.length < 4) {
  fails.push("tierATrustStripPartners must return ≥4 partners");
}
if (!strip.some((p) => p.partnerId === "yahoo_jp")) {
  fails.push("trust strip must include yahoo_jp");
}
if (!strip.some((p) => p.partnerId.startsWith("amazon_"))) {
  fails.push("trust strip must include amazon_*");
}

const mi = require(path.join(root, "services/market-intelligence/src/index.cjs"));
if (!mi.isPartnerListingAdapterId("amazon") || !mi.isPartnerListingAdapterId("yahoo_jp")) {
  fails.push("index must export isPartnerListingAdapterId for amazon/yahoo_jp");
}
if (mi.isForbiddenMarketId("yahoo_jp")) {
  fails.push("yahoo_jp must not be FORBIDDEN market (v7.22.41 partner)");
}
if (mi.isForbiddenAdapterId("yahoo_jp") || mi.isForbiddenAdapterId("amazon")) {
  fails.push("yahoo_jp/amazon adapters must not be FORBIDDEN");
}
if (!mi.PUBLISH_GUARDS?.yahooJpForbidden) {
  fails.push("Day-1 PUBLISH_GUARDS.yahooJpForbidden must remain true");
}
if (!mi.PUBLISH_GUARDS?.amazonAutoPublishForbidden) {
  fails.push("PUBLISH_GUARDS.amazonAutoPublishForbidden must be true");
}

// --- A/B: workers ---
const partnerWorkers = [
  {
    name: "amazon-adapter",
    adapterId: "amazon",
    needles: ["amazon_us", "amazon_jp", "amazon_de", "deploy_ready", "officialPartner"],
  },
  {
    name: "yahoo-jp-adapter",
    adapterId: "yahoo_jp",
    needles: [
      "yahoo_jp",
      "auctions.yahooapis.jp",
      "deploy_ready",
      "officialPartner",
      "Phase1+",
    ],
  },
];

for (const w of partnerWorkers) {
  mustExist(`workers/${w.name}/src/index.ts`);
  mustExist(`workers/${w.name}/wrangler.toml`);
  mustExist(`workers/${w.name}/package.json`);
  const idx = read(`workers/${w.name}/src/index.ts`);
  if (idx) {
    if (!/\/health/.test(idx)) fails.push(`${w.name} must expose /health`);
    if (!/\/tick/.test(idx)) fails.push(`${w.name} must expose /tick`);
    if (!/scheduled/.test(idx)) fails.push(`${w.name} must have scheduled handler`);
    if (!/deploy_ready/.test(idx)) fails.push(`${w.name} must expose deploy_ready`);
    if (!/listingLegPhase/.test(idx) && !/LISTING_LEG_PHASE/.test(idx)) {
      fails.push(`${w.name} must declare listingLegPhase Phase1+`);
    }
    for (const n of w.needles) {
      if (!idx.includes(n) && !read(`workers/${w.name}/src/constants.ts`)?.includes(n)) {
        const constRaw = read(`workers/${w.name}/src/constants.ts`) || "";
        const apiRaw =
          read(`workers/${w.name}/src/paapi.ts`) ||
          read(`workers/${w.name}/src/auction-api.ts`) ||
          "";
        if (!(idx + constRaw + apiRaw).includes(n)) {
          fails.push(`${w.name} missing ${n}`);
        }
      }
    }
  }
  const pkg = read(`workers/${w.name}/package.json`);
  if (pkg && !/wrangler-worker-preview-only\.cjs/.test(pkg)) {
    fails.push(`${w.name} package.json deploy must use preview-only wrangler wrapper`);
  }
  if (pkg && /wrangler\s+deploy/.test(pkg) && /--env[=\s]+production/.test(pkg)) {
    fails.push(`${w.name} package.json must not invoke wrangler deploy --env production`);
  }
  const wr = read(`workers/${w.name}/wrangler.toml`);
  if (wr) {
    if (!new RegExp(`name\\s*=\\s*"${w.name}"`).test(wr)) {
      fails.push(`${w.name} wrangler.toml name mismatch`);
    }
    if (!/PHASE\s*=\s*"1"/.test(wr)) {
      fails.push(`${w.name} wrangler.toml must set PHASE=1`);
    }
    if (!/\[triggers\]/.test(wr) || !/crons\s*=/.test(wr)) {
      fails.push(`${w.name} wrangler.toml must declare cron triggers`);
    }
  }
}

// amazon PA-API client
const paapi = read("workers/amazon-adapter/src/paapi.ts");
if (paapi && !/webservices\.amazon|SearchItems|paapi5/i.test(paapi)) {
  fails.push("amazon-adapter must target PA-API SearchItems");
}

// yahoo auction client
const yapi =
  (read("workers/yahoo-jp-adapter/src/auction-api.ts") || "") +
  (read("workers/yahoo-jp-adapter/src/constants.ts") || "");
if (yapi && !/auctions\.yahooapis\.jp/.test(yapi)) {
  fails.push("yahoo-jp-adapter must call auctions.yahooapis.jp");
}
if (yapi && !/YAHOO_AUCTION_API_BASE|searchAuctions/.test(yapi)) {
  fails.push("yahoo-jp-adapter must expose searchAuctions against YAHOO_AUCTION_API_BASE");
}

// --- workers.manifest phase1 ---
const manifestRaw = read("infra/workers.manifest.json");
if (manifestRaw) {
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    fails.push("workers.manifest.json invalid JSON");
    manifest = null;
  }
  if (manifest) {
    for (const name of ["amazon-adapter", "yahoo-jp-adapter"]) {
      if (!Array.isArray(manifest.phase1) || !manifest.phase1.includes(name)) {
        fails.push(`workers.manifest phase1 must include ${name}`);
      }
      if (Array.isArray(manifest.phase0) && manifest.phase0.includes(name)) {
        fails.push(`phase0 must NOT deploy ${name}`);
      }
    }
  }
}

// --- Nest ingest allow-list ---
const adminSvc = read(
  "services/api-nest/src/adapters/adapters.admin.service.ts",
);
if (adminSvc) {
  if (!/phase1Partners|PARTNER_LISTING/.test(adminSvc)) {
    fails.push("AdaptersAdminService must surface phase1 partners");
  }
  if (!/isIngestableAdapterId/.test(adminSvc)) {
    fails.push("ingest must use isIngestableAdapterId (partners allowed)");
  }
}

const adminPage = read("apps/admin/app/admin/adapters/page.tsx");
if (adminPage) {
  for (const id of ["amazon", "yahoo_jp"]) {
    if (!adminPage.includes(id)) {
      fails.push(`admin adapters page must list ${id}`);
    }
  }
  if (!/공식 협력/.test(adminPage)) {
    fails.push("admin adapters page must state 공식 협력");
  }
}

// Day-1 pricing enum still excludes partner markets (auto-publish lock)
const pricingSchema = JSON.parse(
  read("schemas/opportunity-pricing.v1.json") || "{}",
);
const buyEnum = pricingSchema.properties?.buyMarketId?.enum || [];
if (buyEnum.includes("yahoo_jp") || buyEnum.includes("amazon_us")) {
  fails.push(
    "opportunity-pricing Day-1 enum must not include amazon_*/yahoo_jp yet",
  );
}

if (fails.length) {
  console.error(
    "[verify:market-partner-adapters] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:market-partner-adapters] PASS (amazon + yahoo_jp Phase1+ · partner registry §0.0.1c)",
);
