/**
 * verify:web-remote-patterns — REL-013
 * next.config remotePatterns = 실사용 호스트 최소 allowlist. 임의 https 전체 허용 0.
 */
const fs = require("fs");
const path = require("path");
const { includesHostToken } = require("./lib/host-token-boundary.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const hostsRel = "packages/ui/components/product/image-hosts.ts";
const webCfgRel = "apps/web/next.config.ts";
const hostsSrc = read(hostsRel);
const webCfg = read(webCfgRel);
const r2Src = read("services/api-nest/src/opportunities/asset-image-r2.service.ts");
const pokeSrc = read("services/market-intelligence/src/trading-card-seed.cjs");
const bagSrc = read("services/market-intelligence/src/luxury-bag-seed.cjs");
const watchSrc = read("services/market-intelligence/src/watch-seed.cjs");
const ebaySrc = read("services/market-intelligence/src/ebay-identity-match.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!webCfg.includes("PRODUCT_IMAGE_REMOTE_PATTERNS")) {
  fails.push("apps/web/next.config.ts must use PRODUCT_IMAGE_REMOTE_PATTERNS");
}
if (!webCfg.includes("remotePatterns")) {
  fails.push("apps/web/next.config.ts must set images.remotePatterns");
}
if (/hostname:\s*["']\*{1,2}["']/.test(webCfg + hostsSrc)) {
  fails.push("hostname '*' / '**' (allow-all) is forbidden");
}
if (/protocol:\s*["']https["'][\s\S]{0,80}hostname:\s*["']\*\*?["']/.test(webCfg)) {
  fails.push("next.config must not allow all https hosts");
}

const required = [
  "i.ebayimg.com",
  "images.pokemontcg.io",
  "images.ygoprodeck.com",
  "asset-images.r2.dev",
];
for (const host of required) {
  if (!hostsSrc.includes(`hostname: "${host}"`)) {
    fails.push(`allowlist missing exact host ${host}`);
  }
}

if (!hostsSrc.includes('hostname: "**.r2.cloudflarestorage.com"')) {
  fails.push("R2 constructed URL host wildcard **.r2.cloudflarestorage.com required");
}

const wildcardHosts = [
  ...hostsSrc.matchAll(/hostname:\s*"([^"]*\*[^"]*)"/g),
].map((m) => m[1]);
for (const h of wildcardHosts) {
  if (h !== "**.r2.cloudflarestorage.com") {
    fails.push(`unnecessary wildcard hostname: ${h}`);
  }
}

if (!includesHostToken(r2Src, "r2.cloudflarestorage.com")) {
  fails.push("R2 service must still construct r2.cloudflarestorage.com URLs");
}
if (!includesHostToken(pokeSrc, "images.pokemontcg.io")) {
  fails.push("trading-card seed must still use images.pokemontcg.io");
}
if (!includesHostToken(pokeSrc, "images.ygoprodeck.com")) {
  fails.push("trading-card seed must still use images.ygoprodeck.com");
}
if (!bagSrc.includes("asset-images.r2.dev") || !watchSrc.includes("asset-images.r2.dev")) {
  fails.push("watch/bag seeds must still use asset-images.r2.dev");
}
if (!ebaySrc.includes('EBAY_IMAGE_HOST = "i.ebayimg.com"')) {
  fails.push("ebay identity match must lock i.ebayimg.com");
}

const scanRoots = [
  path.join(root, "apps/web"),
  path.join(root, "packages/ui"),
];
const extraHostRe =
  /https:\/\/([a-z0-9.-]+\.(?:ebayimg\.com|pokemontcg\.io|ygoprodeck\.com|r2\.dev|r2\.cloudflarestorage\.com|imagedelivery\.net))/gi;
const allowedExact = new Set(required);
function hostAllowed(host) {
  if (allowedExact.has(host)) return true;
  if (host.endsWith(".r2.cloudflarestorage.com")) return true;
  return false;
}
for (const dir of scanRoots) {
  walk(dir, (file) => {
    if (!/\.(ts|tsx|js|mjs|cjs)$/.test(file)) return;
    const text = fs.readFileSync(file, "utf8");
    let m;
    extraHostRe.lastIndex = 0;
    while ((m = extraHostRe.exec(text))) {
      if (!hostAllowed(m[1])) {
        fails.push(`unallowlisted image host ${m[1]} in ${path.relative(root, file)}`);
      }
    }
  });
}

if (!pkg.includes('"verify:web-remote-patterns"')) {
  fails.push("package.json missing verify:web-remote-patterns");
}
if (!catalog.includes("web-remote-patterns")) {
  fails.push("CATALOG.md must list web-remote-patterns");
}
if (!domain.includes("web-remote-patterns.cjs")) {
  fails.push("domain-by-path must trigger web-remote-patterns");
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, visit);
    else visit(p);
  }
}

if (fails.length) {
  console.error("[verify:web-remote-patterns] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:web-remote-patterns] PASS (minimal allowlist · used hosts match · https-all 0)",
);
