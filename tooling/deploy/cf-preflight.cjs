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
if (fs.existsSync(path.join(root, "apps/web"))) {
  console.error("[cf:preflight] FAIL: apps/web must not exist in backend-only repo");
  process.exit(1);
}
if (fs.existsSync(path.join(root, "apps/admin"))) {
  console.error("[cf:preflight] FAIL: apps/admin must not exist in backend-only repo");
  process.exit(1);
}

console.log(`[cf:preflight] PASS · target=${target} · surface=${surface}`);
console.log(`  ROOT_DOMAIN=${process.env.ROOT_DOMAIN || "(preview/local)"}`);
