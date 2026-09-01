/** Shared env helpers for Cloudflare deploy scripts (ADR-016) */
const fs = require("fs");
const path = require("path");
const { requireNonProdApiIsolation } = require("./non-prod-api-host.cjs");

const root = path.resolve(__dirname, "../../..");

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
    out[key] = val;
  }
  return out;
}

function isProdTarget(target) {
  return target === "production" || target === "prod";
}

/** preview|staging → wrangler [env.preview]. production only uses [env.production]. */
function resolveWranglerEnv(target) {
  return isProdTarget(target) ? "production" : "preview";
}

function isStagingSlot(slot) {
  return slot === "staging" || slot === "preview";
}

function isPlaceholderRootDomain(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return true;
  if (raw.includes("{") || raw.includes("}")) return true;
  const host = raw.endsWith(".") ? raw.slice(0, -1) : raw;
  const labels = host.split(".");
  if (labels.some((label) => !label)) return true;
  const placeholderSuffixes = ["domain.com", "example.com", "example.net", "example.org"];
  return placeholderSuffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function requireRootDomainForProd(target) {
  if (!isProdTarget(target)) return;
  loadDotEnv();
  const rootDomain = process.env.ROOT_DOMAIN || "";
  if (!rootDomain || rootDomain === "localhost") {
    console.error(
      "[cf-deploy] FAIL: ROOT_DOMAIN must be set to real domain for production deploy"
    );
    console.error("  Set ROOT_DOMAIN=your-domain.com in .env (local) or CI secrets");
    process.exit(1);
  }
  if (isPlaceholderRootDomain(rootDomain)) {
    console.error("[cf-deploy] FAIL: ROOT_DOMAIN still contains placeholder");
    process.exit(1);
  }
}

function requireCloudflareCreds() {
  loadDotEnv();
  const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  if (!hasToken) {
    console.warn(
      "[cf-deploy] WARN: CLOUDFLARE_API_TOKEN not set — wrangler login session used if available"
    );
  }
  if (!hasAccount) {
    console.warn(
      "[cf-deploy] WARN: CLOUDFLARE_ACCOUNT_ID not set — wrangler may prompt or use default account"
    );
  }
  return { hasToken, hasAccount };
}

function mustExist(rel, label) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`[cf-deploy] FAIL: missing ${label}: ${rel}`);
    console.error("  Complete monorepo-skeleton (apps/web or apps/admin) first.");
    process.exit(1);
  }
}

function readWorkersManifest() {
  const p = path.join(root, "infra/workers.manifest.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

module.exports = {
  root,
  loadDotEnv,
  isProdTarget,
  resolveWranglerEnv,
  isStagingSlot,
  isPlaceholderRootDomain,
  requireRootDomainForProd,
  requireCloudflareCreds,
  mustExist,
  readWorkersManifest,
  requireNonProdApiIsolation,
};
