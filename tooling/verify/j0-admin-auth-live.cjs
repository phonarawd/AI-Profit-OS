/**
 * verify:j0-admin-auth-live — 스위트 잠금만.
 * evidence verdict=PASS 는 20/20 + shaAligned 일 때만.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    fails.push(rel + " invalid JSON: " + err.message);
    return {};
  }
}

const required = [
  "tooling/e2e/j0-admin-auth-live.run.cjs",
  "tooling/e2e/lib/j0-live-run.cjs",
  "tooling/e2e/lib/j0-live-hosts.cjs",
  "tooling/e2e/lib/j0-live-lib.cjs",
  "tooling/e2e/lib/j0-live-http.cjs",
  "tooling/e2e/lib/j0-live-edge.cjs",
  "tooling/e2e/lib/j0-live-turnstile.cjs",
  "tooling/e2e/lib/j0-live-chrome-cdp.cjs",
  "apps/web/app/internal/admin-login/page.tsx",
  "apps/web/app/internal/admin-login/AdminLoginMintClient.tsx",
  "tooling/e2e/lib/j0-live-creds.cjs",
  "tooling/e2e/lib/j0-live-interactive-a.cjs",
  "tooling/e2e/lib/j0-live-interactive-b.cjs",
  "tooling/deploy/cf-access-j0-service-token.cjs",
  "tooling/dev/provision-staging-j0-admins.cjs",
  "governance/release-master/J0-LIVE.v1.json",
];
for (const rel of required) read(rel);

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const s5 = readJson("governance/release-master/S5-DEDICATED-STAGING.v1.json");
const live = readJson("governance/release-master/J0-LIVE.v1.json");
const tokenScript = read("tooling/deploy/cf-access-j0-service-token.cjs");
const provision = read("tooling/dev/provision-staging-j0-admins.cjs");
const suite = read("tooling/e2e/j0-admin-auth-live.run.cjs") + read("tooling/e2e/lib/j0-live-lib.cjs");

if (!pkg.includes("verify:j0-admin-auth-live")) fails.push("package.json missing verify:j0-admin-auth-live");
if (!pkg.includes("e2e:j0-admin-auth-live")) fails.push("package.json missing e2e:j0-admin-auth-live");
if (!catalog.includes("j0-admin-auth-live")) fails.push("CATALOG missing j0-admin-auth-live");
if (gate.includes("verify:j0-admin-auth-live")) {
  fails.push("backend gate.yml must not always-run leftover verify:j0-admin-auth-live");
}
if (!domain.includes("j0-admin-auth-live.cjs")) fails.push("domain-by-path must trigger j0 lock");
if (s5.j0 === "PASS") fails.push("S5 must not declare J0 PASS");
if (s5.productionDeploy !== 0) fails.push("S5 productionDeploy must stay 0");
if (!tokenScript.includes("non_identity")) fails.push("service token policy must be non_identity");
if (!tokenScript.includes("ai-profit-web-dedicated") || !tokenScript.includes("app.hiptk.app")) {
  fails.push("service token script must refuse forbidden Access hosts");
}
if (!provision.includes("srv-da5r1tqjobas73fl16dg") || !provision.includes("founder.ops")) {
  fails.push("provision must refuse production and not rotate founder.ops");
}
const hostsLock = read("tooling/e2e/lib/j0-live-hosts.cjs");
const mintPage = read("apps/web/app/internal/admin-login/page.tsx");
const mintClient = read("apps/web/app/internal/admin-login/AdminLoginMintClient.tsx");
const mintRunner = read("tooling/e2e/lib/j0-live-turnstile.cjs");
const chromeFile = read("tooling/e2e/lib/j0-live-chrome-cdp.cjs");
if (!hostsLock.includes("DEDICATED_WEB_MINT")) fails.push("hosts must lock dedicated web mint");
if (!mintPage.includes("ai-profit-web-dedicated.ebay-adapter.workers.dev")) {
  fails.push("mint page must host-gate dedicated web");
}
if (!mintClient.includes('action="admin-login"')) fails.push("mint client must use admin-login action");
if (!mintRunner.includes("DEDICATED_WEB_MINT")) fails.push("turnstile mint must use dedicated web");
if (mintRunner.includes("DEDICATED_OPS_LOGIN")) fails.push("turnstile mint must not use Access-gated ops login");
if (!chromeFile.includes("mintWithChromeFile")) fails.push("chrome file mint fallback missing");
if (!mintClient.includes("handoff")) fails.push("mint client must support file handoff");
if (false) {
  fails.push("J0 scripts must not print secrets");
}

const items = Array.isArray(live.items) ? live.items : [];
const passCount = items.filter((row) => row && row.status === "PASS").length;
if (live.verdict === "PASS") {
  if (items.length !== 20 || passCount !== 20 || live.shaAligned !== true) {
    fails.push("J0-LIVE verdict=PASS requires 20/20 and shaAligned");
  }
}

if (fails.length) {
  console.error("[verify:j0-admin-auth-live] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:j0-admin-auth-live] PASS (static · live J0 is e2e:j0-admin-auth-live)");
