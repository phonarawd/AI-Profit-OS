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

// D1 6-G (2026-09-04): static, credential-free checks first, so a worker
// bundle module-resolution problem (e.g. the Cloudflare Images binding
// requirement - see that script's own header comment for the full
// evidence chain) is caught before this preflight even asks for Cloudflare
// API credentials, and definitely before any deploy attempt.
const imagesBindingCheck = spawnSync(
  "node",
  [path.join(__dirname, "cf-images-binding-preflight.cjs")],
  { cwd: root, stdio: "inherit" },
);
if (imagesBindingCheck.status !== 0) {
  console.error("[cf:preflight] FAIL: cf-images-binding-preflight");
  process.exit(imagesBindingCheck.status || 1);
}

requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();
requireNonProdApiIsolation(target, { root, env: process.env });

const requiredInfra = [
  "infra/web/wrangler.toml",
  "infra/ops/wrangler.toml",
  "infra/ops/access-policy.json",
  "infra/workers.manifest.json",
  "infra/domain.manifest.json",
  "workers/_shared/opennext-origin.ts",
  ".cursor/mcp.json",
];

for (const rel of requiredInfra) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`[cf:preflight] FAIL: missing ${rel}`);
    process.exit(1);
  }
}

const originLock = spawnSync(
  "node",
  [path.join(root, "tooling/verify/opennext-workers-origin.cjs")],
  { cwd: root, stdio: "inherit" }
);
if (originLock.status !== 0) {
  console.error("[cf:preflight] FAIL: verify:opennext-workers-origin");
  process.exit(originLock.status || 1);
}

if (surface === "web") {
  mustExist("apps/web/package.json", "apps/web");
} else if (surface === "ops") {
  mustExist("apps/admin/package.json", "apps/admin");
} else if (surface === "all") {
  const hasWeb = fs.existsSync(path.join(root, "apps/web/package.json"));
  const hasOps = fs.existsSync(path.join(root, "apps/admin/package.json"));
  if (!hasWeb) console.warn("[cf:preflight] skip apps/web — monorepo-skeleton pending");
  if (!hasOps) console.warn("[cf:preflight] skip apps/admin — monorepo-skeleton pending");
}

console.log(`[cf:preflight] PASS · target=${target} · surface=${surface}`);
console.log(`  ROOT_DOMAIN=${process.env.ROOT_DOMAIN || "(preview/local)"}`);
