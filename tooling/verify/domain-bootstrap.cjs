/**
 * verify:domain-bootstrap — infra/domain.manifest.json SSOT drift 0 (Infra §15.0)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function readJson(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fails.push(`missing: ${rel}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

const manifest = readJson("infra/domain.manifest.json");
const operator = readJson("schemas/operator-entity.instance.json");
const envExample = fs.existsSync(path.join(root, ".env.example"))
  ? fs.readFileSync(path.join(root, ".env.example"), "utf8")
  : "";

if (manifest) {
  if (manifest.rootDomain !== "hiptk.app") {
    fails.push("domain.manifest rootDomain must be hiptk.app");
  }
  if (!manifest.cloudflare?.accountId || !manifest.cloudflare?.zoneId) {
    fails.push("domain.manifest cloudflare accountId/zoneId required");
  }
  for (const [key, val] of Object.entries(manifest.env || {})) {
    if (typeof val !== "string" || !val.includes("hiptk.app")) {
      fails.push(`domain.manifest env.${key} must reference hiptk.app`);
    }
  }
  if (!manifest.cloudflare?.workersDevSubdomain) {
    fails.push("domain.manifest cloudflare.workersDevSubdomain required");
  }
  if (manifest.openNext) {
    fails.push("domain.manifest openNext must be handed off (customer web)");
  }
  if (manifest.pages) {
    fails.push("domain.manifest pages must be handed off (customer web)");
  }
  if (manifest.bridgeWorkers?.["web-proxy"] || manifest.bridgeWorkers?.["ops-proxy"]) {
    fails.push("domain.manifest must not keep web-proxy/ops-proxy (handed off)");
  }
  if (!manifest.bridgeWorkers?.["api-stub"]) {
    fails.push("domain.manifest bridgeWorkers api-stub required");
  }
  const apiStub = manifest.bridgeWorkers["api-stub"];
  if (apiStub?.target && !String(apiStub.target).includes("onrender.com") && !String(apiStub.target).includes("hiptk.app")) {
    fails.push("domain.manifest api-stub target must stay Nest origin");
  }
  const forbidden = manifest.forbiddenDeploy || [];
  if (!forbidden.some((x) => String(x).includes("wrangler pages deploy"))) {
    fails.push("manifest forbiddenDeploy must include wrangler pages deploy");
  }
  const prodHosts = manifest.productionHosts || [];
  for (const host of ["app.hiptk.app", "ops.hiptk.app", "api.hiptk.app", "hiptk.app"]) {
    if (!prodHosts.includes(host)) fails.push("productionHosts missing " + host);
  }
  if (fs.existsSync(path.join(root, "workers/_shared/opennext-origin.ts"))) {
    fails.push("workers/_shared/opennext-origin.ts must be removed");
  }
  for (const gone of [
    "infra/web/wrangler.toml",
    "infra/ops/wrangler.toml",
    "workers/web-proxy/wrangler.toml",
    "workers/ops-proxy/wrangler.toml",
  ]) {
    if (fs.existsSync(path.join(root, gone))) fails.push("must be removed: " + gone);
  }
  for (const keep of [
    "workers/api-stub/wrangler.toml",
    "tooling/deploy/cf-domain-bridge.cjs",
  ]) {
    if (!fs.existsSync(path.join(root, keep))) fails.push("missing: " + keep);
  }
}

if (operator) {
  if (operator.relatedWebsite !== "https://hiptk.app") {
    fails.push("operator-entity relatedWebsite drift from hiptk.app");
  }
  if (operator.supportEmail !== "support@hiptk.app") {
    fails.push("operator-entity supportEmail drift from support@hiptk.app");
  }
}

if (envExample && !envExample.includes("ROOT_DOMAIN=hiptk.app")) {
  fails.push(".env.example must document ROOT_DOMAIN=hiptk.app for production");
}

const apiTomlRel = "workers/api-stub/wrangler.toml";
const apiToml = fs.readFileSync(path.join(root, apiTomlRel), "utf8");
if (!apiToml.includes("account_id")) {
  fails.push(apiTomlRel + ": account_id required (wrangler account pin)");
}
if (manifest && !apiToml.includes(manifest.cloudflare.accountId)) {
  fails.push(apiTomlRel + ": account_id must match domain.manifest");
}

if (fails.length) {
  console.error("[verify:domain-bootstrap] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:domain-bootstrap] PASS (hiptk.app SSOT · Workers · DNS manifest)");
