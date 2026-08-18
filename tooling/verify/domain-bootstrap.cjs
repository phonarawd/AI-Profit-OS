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
  if (!manifest.openNext || manifest.openNext.runtime !== "workers") {
    fails.push("domain.manifest openNext.runtime must be workers");
  }
  if (!manifest.openNext?.web?.workersDev || !manifest.openNext?.ops?.workersDev) {
    fails.push("domain.manifest openNext web/ops workersDev required");
  }
  if (!manifest.pages?.web?.project || !manifest.pages?.ops?.project) {
    fails.push("domain.manifest pages web/ops projects required");
  }
  if (!manifest.pages?.web?.workersDev || !manifest.pages?.ops?.workersDev) {
    fails.push("domain.manifest pages web/ops workersDev required (OpenNext Workers)");
  }
  if (
    manifest.openNext?.web?.workersDev &&
    manifest.pages?.web?.workersDev !== manifest.openNext.web.workersDev
  ) {
    fails.push("pages.web.workersDev must equal openNext.web.workersDev");
  }
  if (
    manifest.openNext?.ops?.workersDev &&
    manifest.pages?.ops?.workersDev !== manifest.openNext.ops.workersDev
  ) {
    fails.push("pages.ops.workersDev must equal openNext.ops.workersDev");
  }
  if (!fs.existsSync(path.join(root, "workers/_shared/opennext-origin.ts"))) {
    fails.push("missing: workers/_shared/opennext-origin.ts");
  }
  const webProxy = manifest.bridgeWorkers?.["web-proxy"];
  const opsProxy = manifest.bridgeWorkers?.["ops-proxy"];
  if (!webProxy || !manifest.bridgeWorkers?.["api-stub"]) {
    fails.push("domain.manifest bridgeWorkers web-proxy/api-stub required");
  }
  if (webProxy?.target && !String(webProxy.target).includes("workers.dev")) {
    fails.push("domain.manifest web-proxy target must be workers.dev (not pages.dev)");
  }
  if (opsProxy?.target && !String(opsProxy.target).includes("workers.dev")) {
    fails.push("domain.manifest ops-proxy target must be workers.dev (not pages.dev)");
  }
  for (const rel of [
    "workers/web-proxy/wrangler.toml",
    "workers/ops-proxy/wrangler.toml",
    "workers/api-stub/wrangler.toml",
    "tooling/deploy/cf-domain-bridge.cjs",
  ]) {
    if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
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

for (const rel of ["infra/web/wrangler.toml", "infra/ops/wrangler.toml"]) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fails.push(`missing: ${rel}`);
    continue;
  }
  const text = fs.readFileSync(full, "utf8");
  if (!text.includes("account_id")) {
    fails.push(`${rel}: account_id required (wrangler account pin)`);
  }
  if (manifest && !text.includes(manifest.cloudflare.accountId)) {
    fails.push(`${rel}: account_id must match domain.manifest`);
  }
}

if (fails.length) {
  console.error("[verify:domain-bootstrap] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:domain-bootstrap] PASS (hiptk.app SSOT · Workers · DNS manifest)");
