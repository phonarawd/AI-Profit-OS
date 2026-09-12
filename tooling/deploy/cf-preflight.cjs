#!/usr/bin/env node
/** Preflight before any Cloudflare deploy */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  root,
  loadDotEnv,
  requireRootDomainForProd,
  requireCloudflareCreds,
  mustExist,
  requireNonProdApiIsolation,
} = require("./lib/env.cjs");

const target = process.argv[2] || "preview";
const surface = process.argv[3] || "all";

requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();
requireNonProdApiIsolation(target, { root, env: process.env });

const requiredInfra = [
  "infra/workers.manifest.json",
  "infra/domain.manifest.json",
  "workers/api-stub/wrangler.toml",
  "workers/push-dispatcher/wrangler.toml",
  ".cursor/mcp.json",
];

for (const rel of requiredInfra) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`[cf:preflight] FAIL: missing ${rel}`);
    process.exit(1);
  }
}

if (surface === "web" || surface === "ops") {
  console.error("[cf:preflight] FAIL: surface=" + surface + " handed off to putduk-web");
  process.exit(1);
}
const handedOffWeb = ["apps", "web"];
const handedOffAdmin = ["apps", "admin"];
if (fs.existsSync(path.join(root, handedOffWeb[0], handedOffWeb[1]))) {
  console.error("[cf:preflight] FAIL: customer web tree must not exist in backend-only repo");
  process.exit(1);
}
if (fs.existsSync(path.join(root, handedOffAdmin[0], handedOffAdmin[1]))) {
  console.error("[cf:preflight] FAIL: legacy admin tree must not exist in backend-only repo");
  process.exit(1);
}

console.log(`[cf:preflight] PASS · target=${target} · surface=${surface}`);
console.log(`  ROOT_DOMAIN=${process.env.ROOT_DOMAIN || "(preview/local)"}`);
