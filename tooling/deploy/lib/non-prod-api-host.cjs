/**
 * 비프로덕션 배포는 Production API 호스트를 상속하지 않는다.
 * 스테이징 호스트를 날조하지 않는다. 없으면 fail-closed.
 */
"use strict";

const fs = require("fs");
const path = require("path");

function loadDomainManifest(root) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "infra/domain.manifest.json"), "utf8"),
  );
}

function loadForbiddenHosts(root) {
  const manifest = loadDomainManifest(root);
  const hosts = (manifest.openNext &&
    manifest.openNext.staging &&
    manifest.openNext.staging.forbiddenHosts) || [];
  return new Set(hosts);
}

function normalizeApiUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return { ok: false, reason: "empty" };
  }
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!parsed.hostname) {
    return { ok: false, reason: "invalid_url" };
  }
  return { ok: true, href: `${parsed.protocol}//${parsed.host}`, host: parsed.hostname };
}

function assertNonProdApiHost(raw, forbiddenHosts) {
  const normalized = normalizeApiUrl(raw);
  if (!normalized.ok) return normalized;
  if (forbiddenHosts.has(normalized.host)) {
    return { ok: false, reason: "production_host", host: normalized.host };
  }
  return normalized;
}

function resolveNonProdApiHost(env, forbiddenHosts) {
  const staging = env && env.STAGING_API_HOST;
  if (!staging || !String(staging).trim()) {
    return { ok: false, reason: "missing_staging_api_host" };
  }
  return assertNonProdApiHost(staging, forbiddenHosts);
}

function requireNonProdApiIsolation(target, opts) {
  const isProd = target === "production" || target === "prod";
  if (isProd) return { skipped: true };
  const root = opts.root;
  const env = opts.env || process.env;
  const forbidden = loadForbiddenHosts(root);
  const result = resolveNonProdApiHost(env, forbidden);
  if (!result.ok) {
    const msg =
      result.reason === "missing_staging_api_host"
        ? "STAGING_API_HOST required for non-production target — production API_HOST inheritance forbidden"
        : result.reason === "production_host"
          ? `STAGING_API_HOST targets production host: ${result.host}`
          : "STAGING_API_HOST is not a valid URL";
    console.error(`[cf-deploy] FAIL: ${msg}`);
    process.exit(1);
  }
  env.API_HOST = result.href;
  return result;
}

function writeApiHostEnv(root, href) {
  fs.appendFileSync(path.join(root, ".env"), `API_HOST=${href}\n`);
}

if (require.main === module) {
  const root = path.resolve(__dirname, "../../..");
  const result = requireNonProdApiIsolation("preview", { root, env: process.env });
  if (process.argv.includes("--write-env")) {
    writeApiHostEnv(root, result.href);
  }
  console.log(`[non-prod-api-host] PASS · host=${result.host}`);
}

module.exports = {
  loadForbiddenHosts,
  normalizeApiUrl,
  assertNonProdApiHost,
  resolveNonProdApiHost,
  requireNonProdApiIsolation,
  writeApiHostEnv,
};
