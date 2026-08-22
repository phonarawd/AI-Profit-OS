/**
 * verify:rel-401-security-headers — required headers, no wildcard CSP abuse
 */
const fs = require("fs");
const path = require("path");

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

const ssotPath = path.join(root, "tooling/security/security-headers.cjs");
const ssot = require(ssotPath);
const nestMain = read("services/api-nest/src/main.ts");
const nestMw = read("services/api-nest/src/common/security-headers.ts");
const webCfg = read("apps/web/next.config.ts");
const adminCfg = read("apps/admin/next.config.ts");
const sw = read("apps/web/public/sw.js");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

const requiredKeys = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Frame-Options",
  "X-Content-Type-Options",
];

for (const kind of ["api", "web", "admin"]) {
  const pairs = ssot.headerPairs(kind);
  const map = Object.fromEntries(pairs);
  for (const key of requiredKeys) {
    if (!map[key]) fails.push(`${kind} missing ${key}`);
  }
  if (map["X-Frame-Options"] !== "DENY") {
    fails.push(`${kind} X-Frame-Options must be DENY`);
  }
  if (ssot.hasWildcardAbuse(map["Content-Security-Policy"])) {
    fails.push(`${kind} CSP has wildcard/scheme-source abuse`);
  }
}

if (!nestMain.includes("securityHeadersMiddleware")) {
  fails.push("api-nest main.ts must apply securityHeadersMiddleware");
}
if (!nestMw.includes("security-headers.cjs")) {
  fails.push("nest middleware must consume shared SSOT");
}
if (webCfg.includes('nextHeadersFor("web")')) {
  fails.push("consumer next.config must not take Home-risk headers in this REL");
}
if (!adminCfg.includes('nextHeadersFor("admin")')) {
  fails.push("admin next.config must apply nextHeadersFor(admin)");
}

const webCsp = ssot.cspFor("web");
if (sw.includes("addEventListener") && !webCsp.includes("worker-src 'self'")) {
  fails.push("web CSP must allow same-origin service worker");
}
if (webCsp.includes("*") && !webCsp.includes("*.r2.cloudflarestorage.com")) {
  fails.push("web CSP must not use a bare *");
}

if (!pkg.includes("verify:rel-401-security-headers")) {
  fails.push("package.json missing verify:rel-401-security-headers");
}
if (!catalog.includes("rel-401-security-headers")) {
  fails.push("CATALOG.md missing rel-401-security-headers");
}

if (fails.length) {
  console.error("[verify:rel-401-security-headers] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-401-security-headers] PASS");
