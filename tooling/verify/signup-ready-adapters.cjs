/**
 * verify:signup-ready-adapters — Engine §0.0 signup-ready-adapters
 * A: ebay multi marketplaceId
 * B: pokemontcg + ygoprodeck
 * C: coingecko + frankfurter
 * Day-1 signup-ready 5 · partner amazon/yahoo = verify:market-partner-adapters
 * Phase1 deploy (not phase0)
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

function declaredApiBase(source) {
  if (!source) return null;
  const match = source.match(/\bAPI_BASE\s*=\s*["']([^"']+)["']/);
  if (!match) return null;
  try {
    return new URL(match[1]);
  } catch {
    return null;
  }
}

function hasExactHttpsApiHost(constantsSource, expectedHost) {
  const url = declaredApiBase(constantsSource);
  return url?.protocol === "https:" && url.hostname === expectedHost;
}

const workers = [
  "ebay-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
];

for (const name of workers) {
  mustExist(`workers/${name}/src/index.ts`);
  mustExist(`workers/${name}/wrangler.toml`);
  mustExist(`workers/${name}/package.json`);
  const idx = read(`workers/${name}/src/index.ts`);
  if (idx) {
    if (!/deploy_ready/.test(idx)) {
      fails.push(`${name} must expose status deploy_ready`);
    }
    if (!/\/health/.test(idx)) {
      fails.push(`${name} must expose /health`);
    }
    if (!/\/tick/.test(idx)) {
      fails.push(`${name} must expose /tick`);
    }
    if (!/scheduled/.test(idx)) {
      fails.push(`${name} must have scheduled cron handler`);
    }
    if (/phase:\s*["']stub["']|phase = "stub"/.test(idx)) {
      fails.push(`${name} must not remain Phase0 stub`);
    }
    // partner yahoo path lives in yahoo-jp-adapter only (separate verify)
    if (
      name !== "ebay-adapter" &&
      /yahoo_jp|yahoo-jp/.test(idx) &&
      !/FORBIDDEN|yahooJp:\s*false|Day-1|ebay\|admin/.test(idx)
    ) {
      fails.push(`${name} must not own yahoo listing (partner worker only)`);
    }
  }
  const pkg = read(`workers/${name}/package.json`);
  if (pkg) {
    if (/echo 'Phase1\+ only'/.test(pkg) || /echo \"Phase1\+ only\"/.test(pkg)) {
      fails.push(`${name} package.json deploy must use wrangler (not echo stub)`);
    }
    if (!/wrangler-worker-preview-only\.cjs/.test(pkg)) {
      fails.push(`${name} package.json deploy must use preview-only wrangler wrapper`);
    }
    if (/wrangler\s+deploy/.test(pkg) && /--env[=\s]+production/.test(pkg)) {
      fails.push(`${name} package.json must not invoke wrangler deploy --env production`);
    }
  }
  const wr = read(`workers/${name}/wrangler.toml`);
  if (wr) {
    if (!new RegExp(`name\\s*=\\s*"${name}"`).test(wr)) {
      fails.push(`${name} wrangler.toml missing name`);
    }
    if (!/PHASE\s*=\s*"1"/.test(wr)) {
      fails.push(`${name} wrangler.toml must set PHASE=1`);
    }
    if (!/\[triggers\]/.test(wr) || !/crons\s*=/.test(wr)) {
      fails.push(`${name} wrangler.toml must declare cron triggers`);
    }
  }
}

// A: ebay multi marketplaceId
const ebayIdx = read("workers/ebay-adapter/src/index.ts");
const ebayConst = read("workers/ebay-adapter/src/constants.ts");
const ebayBrowse = read("workers/ebay-adapter/src/browse-api.ts");
for (const id of ["EBAY_US", "EBAY_GB", "EBAY_DE", "EBAY_AU"]) {
  if (ebayConst && !ebayConst.includes(id)) {
    fails.push(`ebay-adapter constants missing ${id}`);
  }
}
if (ebayIdx && !/marketplaceId|MARKETPLACE/.test(ebayIdx)) {
  fails.push("ebay-adapter must use marketplaceId multi-leg");
}
if (ebayBrowse && !/item_summary\/search|item_summary/.test(ebayBrowse)) {
  fails.push("ebay-adapter must call Browse item_summary/search");
}
if (ebayBrowse && !/X-EBAY-C-MARKETPLACE-ID/.test(ebayBrowse)) {
  fails.push("ebay-adapter Browse client must set X-EBAY-C-MARKETPLACE-ID");
}

// B: pokemontcg + ygoprodeck
const poke = read("workers/pokemontcg-adapter/src/index.ts");
const ygo = read("workers/ygoprodeck-adapter/src/index.ts");
const pokeConstants = read("workers/pokemontcg-adapter/src/constants.ts");
const ygoConstants = read("workers/ygoprodeck-adapter/src/constants.ts");
const pokeClient = read("workers/pokemontcg-adapter/src/client.ts");
const ygoClient = read("workers/ygoprodeck-adapter/src/client.ts");

if (!hasExactHttpsApiHost(pokeConstants, "api.pokemontcg.io")) {
  fails.push("pokemontcg-adapter API_BASE must be exact https://api.pokemontcg.io host");
}
if (!pokeClient?.includes("API_BASE")) {
  fails.push("pokemontcg-adapter client must use API_BASE");
}
if (!hasExactHttpsApiHost(ygoConstants, "db.ygoprodeck.com")) {
  fails.push("ygoprodeck-adapter API_BASE must be exact https://db.ygoprodeck.com host");
}
if (!ygoClient?.includes("API_BASE")) {
  fails.push("ygoprodeck-adapter client must use API_BASE");
}
if (poke && !/catalog_ref|listingLeg:\s*false/.test(poke)) {
  fails.push("pokemontcg must mark catalog_ref (not listing leg)");
}
if (ygo && !/catalog_ref|listingLeg:\s*false/.test(ygo)) {
  fails.push("ygoprodeck must mark catalog_ref (not listing leg)");
}

// C: coingecko + frankfurter
const cg = read("workers/coingecko-adapter/src/constants.ts");
const fr = read("workers/frankfurter-adapter/src/constants.ts");
const cgClient = read("workers/coingecko-adapter/src/client.ts");
const frClient = read("workers/frankfurter-adapter/src/client.ts");

if (!hasExactHttpsApiHost(cg, "api.coingecko.com")) {
  fails.push("coingecko-adapter API_BASE must be exact https://api.coingecko.com host");
}
if (!cgClient?.includes("API_BASE")) {
  fails.push("coingecko-adapter client must use API_BASE");
}
if (!hasExactHttpsApiHost(fr, "api.frankfurter.dev")) {
  fails.push("frankfurter-adapter API_BASE must be exact https://api.frankfurter.dev host");
}
if (!frClient?.includes("API_BASE")) {
  fails.push("frankfurter-adapter client must use API_BASE");
}
// KR / non-partner scrapers still forbidden
for (const banned of ["rolex-adapter", "chrono24-adapter", "tcgplayer-adapter"]) {
  if (fs.existsSync(path.join(root, "workers", banned))) {
    fails.push(`workers/${banned} FORBIDDEN`);
  }
}

const readme = read("workers/README.md");
if (readme && !/ebay-adapter/.test(readme)) {
  fails.push("workers/README.md must document ebay-adapter");
}

// Phase1 deploy manifest — adapters in phase1, NOT phase0
const manifestRaw = read("infra/workers.manifest.json");
if (manifestRaw) {
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    fails.push("infra/workers.manifest.json invalid JSON");
    manifest = null;
  }
  if (manifest) {
    for (const name of workers) {
      if (!Array.isArray(manifest.phase1) || !manifest.phase1.includes(name)) {
        fails.push(`workers.manifest phase1 must include ${name}`);
      }
      if (Array.isArray(manifest.phase0) && manifest.phase0.includes(name)) {
        fails.push(`phase0 must NOT deploy ${name} (Phase1 only)`);
      }
    }
  }
}

// Nest admin + ingest contract
const nestFiles = [
  "services/api-nest/src/adapters/adapters.module.ts",
  "services/api-nest/src/adapters/adapters.admin.controller.ts",
  "services/api-nest/src/adapters/adapters.admin.service.ts",
  "services/api-nest/src/adapters/adapters.ingest.controller.ts",
  "services/api-nest/src/adapters/adapters.routes.ts",
  "services/api-nest/src/adapters/adapters.events.ts",
  "services/market-intelligence/src/adapters.cjs",
];
for (const f of nestFiles) mustExist(f);

const appMod = read("services/api-nest/src/app.module.ts");
if (appMod && !/AdaptersModule/.test(appMod)) {
  fails.push("AppModule must import AdaptersModule");
}

const routes = read("services/api-nest/src/adapters/adapters.routes.ts");
if (routes) {
  for (const needle of [
    "adapters",
    "listing-legs",
    "matching-kpi",
    "internal/adapters/ingest",
  ]) {
    if (!routes.includes(needle)) {
      fails.push(`adapters.routes missing ${needle}`);
    }
  }
}

const events = read("services/api-nest/src/adapters/adapters.events.ts");
if (events && !/adapter\.health\.changed/.test(events)) {
  fails.push("ADAPTER_EVENTS must include adapter.health.changed");
}

const adminPage = read("apps/admin/app/admin/adapters/page.tsx");
if (adminPage) {
  for (const id of ["ebay", "pokemontcg", "ygoprodeck", "coingecko", "frankfurter"]) {
    if (!adminPage.includes(id)) {
      fails.push(`admin adapters page must list ${id}`);
    }
  }
  if (/nearMissCap/.test(adminPage)) {
    fails.push("admin adapters page must not own nearMissCap settings");
  }
}

// Registry SSOT
const reg = require(path.join(
  root,
  "services/market-intelligence/src/adapters.cjs",
));
for (const id of [
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "coingecko",
  "frankfurter",
]) {
  if (!reg.SIGNUP_READY_ADAPTER_IDS.includes(id)) {
    fails.push(`SIGNUP_READY_ADAPTER_IDS missing ${id}`);
  }
}
for (const id of ["EBAY_US", "EBAY_GB", "EBAY_DE", "EBAY_AU"]) {
  if (!reg.EBAY_MARKETPLACE_IDS.includes(id)) {
    fails.push(`EBAY_MARKETPLACE_IDS missing ${id}`);
  }
}

if (fails.length) {
  console.error("[verify:signup-ready-adapters] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:signup-ready-adapters] PASS (ebay multi · pokemontcg+ygo · coingecko+frankfurter · Phase1 deploy)",
);
