/**
 * verify:listing-legs-day1 — Engine §0.0.1a (v7.22.41)
 * Day-1 auto-publish listing = ebay 멀티 marketplace | admin only
 * amazon/yahoo_jp = official partners · Phase1+ adapters (verify:market-partner-adapters)
 * KR C2C / Chrono24 as listing adapters = FORBIDDEN
 * User copy in packages/ui/copy + apps/web: Yahoo/야후 still gated until UI §38.10 todo
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

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist")
        continue;
      walkFiles(full, exts, out);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// --- workers: Day-1 signup-ready required · partner Phase1+ allowed ---
const workersDir = path.join(root, "workers");
const requiredAdapters = [
  "ebay-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
];
for (const name of requiredAdapters) {
  if (!fs.existsSync(path.join(workersDir, name))) {
    fails.push(`missing workers/${name}`);
  }
}
for (const banned of ["rolex-adapter", "chrono24-adapter", "tcgplayer-adapter"]) {
  if (fs.existsSync(path.join(workersDir, banned))) {
    fails.push(`workers/${banned} FORBIDDEN on Day-1`);
  }
}

const workersReadme = read("workers/README.md");
if (workersReadme) {
  if (!/amazon-adapter/.test(workersReadme) || !/yahoo-jp-adapter/.test(workersReadme)) {
    fails.push("workers/README.md must document amazon-adapter + yahoo-jp-adapter Phase1+");
  }
  if (!/Day-1|ebay/.test(workersReadme)) {
    fails.push("workers/README.md must keep Day-1 ebay listing note");
  }
}

// --- .env.example: Day-1 auto-publish ebay|admin · partner keys optional Phase1+ ---
const envEx = read(".env.example");
if (envEx) {
  if (!/Day-1|ebay/.test(envEx)) {
    fails.push(".env.example must document Day-1 ebay listing");
  }
  if (!/amazon|yahoo_jp|Phase1\+/i.test(envEx)) {
    fails.push(".env.example must document Phase1+ amazon/yahoo_jp partners");
  }
}

// --- schemas: Day-1 opportunity-pricing marketId enum ---
const pricingPath = "schemas/opportunity-pricing.v1.json";
const pricingRaw = read(pricingPath);
if (pricingRaw) {
  let pricing;
  try {
    pricing = JSON.parse(pricingRaw);
  } catch {
    fails.push(`${pricingPath} invalid JSON`);
    pricing = null;
  }
  if (pricing) {
    const allowed = ["ebay_us", "ebay_gb", "ebay_de", "ebay_au", "admin"];
    for (const key of ["buyMarketId", "sellMarketId"]) {
      const en = pricing.properties?.[key]?.enum;
      if (!Array.isArray(en)) {
        fails.push(`${pricingPath} ${key}.enum missing`);
        continue;
      }
      if (en.includes("yahoo_jp")) {
        fails.push(`${key} Day-1 enum must not include yahoo_jp`);
      }
      if (en.includes("amazon_us")) {
        fails.push(`${key} Day-1 enum must not include amazon_*`);
      }
      for (const id of allowed) {
        if (!en.includes(id)) fails.push(`${key} enum missing ${id}`);
      }
      for (const id of en) {
        if (!allowed.includes(id)) fails.push(`${key} enum unexpected ${id}`);
      }
    }
  }
}

const cardRaw = read("schemas/opportunity-card.v1.json");
if (cardRaw && !/ebay_\*|admin|yahoo_jp/.test(cardRaw)) {
  fails.push(
    "opportunity-card.v1.json must mention ebay|admin listing / yahoo_jp phase note",
  );
}

// --- migration guard (Day-1 pricing table) ---
const mig = read("supabase/migrations/20260808205850_opportunities_pricing.sql");
if (mig) {
  if (!/yahoo_jp/.test(mig)) {
    fails.push("opportunities_pricing migration must guard yahoo_jp");
  }
  if (!/opportunities_pricing_no_yahoo_chk/.test(mig)) {
    fails.push("missing opportunities_pricing_no_yahoo_chk constraint");
  }
}

// --- user-facing copy: 야후 / Yahoo / yahoo_jp = 0 until UI §38.10 trust todo ---
const copyRoot = path.join(root, "packages/ui/copy");
const copyFiles = walkFiles(copyRoot, [".ts", ".tsx", ".json"]);
const bannedCopy = [/야후/, /\bYahoo\b/, /yahoo_jp/i, /yahoo-jp/i];
for (const file of copyFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const re of bannedCopy) {
    if (re.test(text)) {
      fails.push(
        `user copy gated match ${re} in ${path.relative(root, file)} (UI §38.10 todo)`,
      );
    }
  }
}

const webRoot = path.join(root, "apps/web");
if (fs.existsSync(webRoot)) {
  const webFiles = walkFiles(webRoot, [".ts", ".tsx"]);
  for (const file of webFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of bannedCopy) {
      if (re.test(text)) {
        fails.push(
          `apps/web gated match ${re} in ${path.relative(root, file)} (UI §38.10 todo)`,
        );
      }
    }
  }
}

// --- Engine plan SSOT: Day-1 ebay|admin + partner registry ---
const enginePlan = path.join(
  root,
  ".cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md",
);
if (fs.existsSync(enginePlan)) {
  const plan = fs.readFileSync(enginePlan, "utf8");
  if (!/ebay_us/.test(plan) || !/ebay_gb/.test(plan)) {
    fails.push("Engine plan must lock ebay_us/ebay_gb market ids");
  }
  if (!/0\.0\.1c|Market Partner Registry/.test(plan)) {
    fails.push("Engine plan must include §0.0.1c Market Partner Registry");
  }
  if (!/Day-1 pricing leg|ebay 멀티|admin/.test(plan)) {
    fails.push("Engine plan must keep Day-1 ebay|admin pricing leg lock");
  }
}

// pipeline Day-1 auto-publish guard
const pipeline = require(path.join(
  root,
  "services/market-intelligence/src/pipeline.cjs",
));
if (!pipeline.PUBLISH_GUARDS.yahooJpForbidden) {
  fails.push("PUBLISH_GUARDS.yahooJpForbidden must be true for Day-1 auto-publish");
}
if (
  !Array.isArray(pipeline.PUBLISH_GUARDS.listingLegsOnly) ||
  !pipeline.PUBLISH_GUARDS.listingLegsOnly.includes("ebay") ||
  !pipeline.PUBLISH_GUARDS.listingLegsOnly.includes("admin")
) {
  fails.push("PUBLISH_GUARDS.listingLegsOnly must be ebay|admin");
}

if (fails.length) {
  console.error("[verify:listing-legs-day1] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:listing-legs-day1] PASS (ebay 멀티|admin Day-1 · partner amazon/yahoo Phase1+ · UI copy gated)",
);
