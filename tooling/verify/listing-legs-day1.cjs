/**
 * verify:listing-legs-day1 — Engine §0.0.1a / §0.0.2 (v7.22.32)
 * Day-1 listing = ebay 멀티 marketplace | admin only
 * yahoo_jp / Yahoo / 야후 / YAHOO_* / yahoo-jp-adapter = FORBIDDEN
 * KR C2C / Chrono24 as listing adapters = FORBIDDEN
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
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist") continue;
      walkFiles(full, exts, out);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// --- workers ---
const workersDir = path.join(root, "workers");
if (fs.existsSync(path.join(workersDir, "yahoo-jp-adapter"))) {
  fails.push("workers/yahoo-jp-adapter must not exist (FORBIDDEN)");
}
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
if (workersReadme && !/yahoo-jp-adapter/.test(workersReadme)) {
  fails.push("workers/README.md must document yahoo-jp-adapter FORBIDDEN");
}
if (workersReadme && !/FORBIDDEN/.test(workersReadme)) {
  fails.push("workers/README.md must mark yahoo-jp FORBIDDEN");
}

// --- .env.example: no YAHOO_* assignment slots ---
const envEx = read(".env.example");
if (envEx) {
  const assignLines = envEx
    .split(/\r?\n/)
    .filter((l) => /^\s*YAHOO_[A-Z0-9_]+\s*=/.test(l));
  if (assignLines.length) {
    fails.push(`.env.example must not define YAHOO_* keys: ${assignLines.join(" | ")}`);
  }
  if (!/yahoo_jp\s*=\s*영구 FORBIDDEN|yahoo_jp.*FORBIDDEN/i.test(envEx)) {
    fails.push(".env.example must document yahoo_jp FORBIDDEN");
  }
}

// --- schemas: marketId enum ---
const pricingPath = "schemas/opportunity-pricing.v1.json";
const pricingRaw = read(pricingPath);
if (pricingRaw) {
  let pricing;
  try {
    pricing = JSON.parse(pricingRaw);
  } catch (e) {
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
      if (en.includes("yahoo_jp")) fails.push(`${key} enum must not include yahoo_jp`);
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
if (cardRaw && /yahoo_jp/.test(cardRaw) === false) {
  // description SHOULD mention FORBIDDEN — soft require
  fails.push("opportunity-card.v1.json must mention yahoo_jp FORBIDDEN in description");
}

// --- migration guard ---
const mig = read("supabase/migrations/20260808205850_opportunities_pricing.sql");
if (mig) {
  if (!/yahoo_jp/.test(mig)) {
    fails.push("opportunities_pricing migration must guard yahoo_jp");
  }
  if (!/opportunities_pricing_no_yahoo_chk/.test(mig)) {
    fails.push("missing opportunities_pricing_no_yahoo_chk constraint");
  }
}

// --- user-facing copy: 야후 / Yahoo / yahoo_jp = 0 ---
const copyRoot = path.join(root, "packages/ui/copy");
const copyFiles = walkFiles(copyRoot, [".ts", ".tsx", ".json"]);
const bannedCopy = [/야후/, /\bYahoo\b/, /yahoo_jp/i, /yahoo-jp/i];
for (const file of copyFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const re of bannedCopy) {
    if (re.test(text)) {
      fails.push(`user copy FORBIDDEN match ${re} in ${path.relative(root, file)}`);
    }
  }
}

// --- apps/web surface strings (if any) ---
const webRoot = path.join(root, "apps/web");
if (fs.existsSync(webRoot)) {
  const webFiles = walkFiles(webRoot, [".ts", ".tsx"]);
  for (const file of webFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of bannedCopy) {
      if (re.test(text)) {
        fails.push(`apps/web FORBIDDEN match ${re} in ${path.relative(root, file)}`);
      }
    }
  }
}

// --- Engine plan SSOT still locks ebay|admin listing (pointer integrity) ---
const enginePlan = path.join(
  root,
  ".cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md",
);
if (fs.existsSync(enginePlan)) {
  const plan = fs.readFileSync(enginePlan, "utf8");
  if (!/ebay_us/.test(plan) || !/ebay_gb/.test(plan)) {
    fails.push("Engine plan must lock ebay_us/ebay_gb market ids");
  }
  if (!/영구 배제|FORBIDDEN/.test(plan) || !/yahoo_jp/.test(plan)) {
    fails.push("Engine plan must keep yahoo_jp FORBIDDEN lock");
  }
}

if (fails.length) {
  console.error("[verify:listing-legs-day1] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:listing-legs-day1] PASS (ebay 멀티|admin · yahoo_jp FORBIDDEN · 야후/Yahoo copy 0)",
);
