/**
 * BACKEND-ONLY PORT of tooling/verify/web-remote-patterns.cjs (recovery base SHA 97b07908 · REL-013).
 * UI assertions (apps/web next.config remotePatterns · packages/ui image-hosts allowlist · web tree host scan)
 * were recorded in quality/putduk-web-ui-assertions-handoff.md 1d. The server side of the contract stays here:
 * every image host the backend emits must be one of the known hosts (the customer web allowlist mirrors this set).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const r2Src = read("services/api-nest/src/opportunities/asset-image-r2.service.ts");
const pokeSrc = read("services/market-intelligence/src/trading-card-seed.cjs");
const bagSrc = read("services/market-intelligence/src/luxury-bag-seed.cjs");
const watchSrc = read("services/market-intelligence/src/watch-seed.cjs");
const ebaySrc = read("services/market-intelligence/src/ebay-identity-match.cjs");

/** Known image hosts (customer web remotePatterns allowlist mirrors this set exactly). */
const KNOWN_EXACT = new Set([
  "i.ebayimg.com",
  "images.pokemontcg.io",
  "images.ygoprodeck.com",
  "asset-images.r2.dev",
]);
function hostAllowed(host) {
  return KNOWN_EXACT.has(host) || host.endsWith(".r2.cloudflarestorage.com");
}

if (!r2Src.includes("r2.cloudflarestorage.com")) {
  fails.push("R2 service must still construct r2.cloudflarestorage.com URLs");
}
if (!pokeSrc.includes("images.pokemontcg.io")) {
  fails.push("trading-card seed must still use images.pokemontcg.io");
}
if (!pokeSrc.includes("images.ygoprodeck.com")) {
  fails.push("trading-card seed must still use images.ygoprodeck.com");
}
if (!bagSrc.includes("asset-images.r2.dev") || !watchSrc.includes("asset-images.r2.dev")) {
  fails.push("watch/bag seeds must still use asset-images.r2.dev");
}
if (!ebaySrc.includes('EBAY_IMAGE_HOST = "i.ebayimg.com"')) {
  fails.push("ebay identity match must lock i.ebayimg.com");
}

// No backend source may emit an image host outside the known set (allowlist parity with putduk-web)
const extraHostRe =
  /https:\/\/([a-z0-9.-]+\.(?:ebayimg\.com|pokemontcg\.io|ygoprodeck\.com|r2\.dev|r2\.cloudflarestorage\.com|imagedelivery\.net))/gi;
function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "target") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, visit);
    else visit(p);
  }
}
for (const dir of [path.join(root, "services/api-nest/src"), path.join(root, "services/market-intelligence/src")]) {
  walk(dir, (file) => {
    if (!/\.(ts|js|mjs|cjs)$/.test(file)) return;
    const text = fs.readFileSync(file, "utf8");
    let m;
    extraHostRe.lastIndex = 0;
    while ((m = extraHostRe.exec(text))) {
      if (!hostAllowed(m[1])) {
        fails.push(`unknown image host ${m[1]} in ${path.relative(root, file).replace(/\\/g, "/")}`);
      }
    }
  });
}

if (fails.length) {
  console.error("[verify:backend/image-hosts-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:backend/image-hosts-contract] PASS (server image hosts = known set · unknown host 0)");
