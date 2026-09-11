/** verify:cf-infra — Cloudflare deploy scaffold present (Infra §15) */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const required = [
  ".cursor/mcp.json",
  "infra/hosts.manifest.json",
  "infra/domain.manifest.json",
  "tooling/deploy/cf-domain-bootstrap.cjs",
  "infra/api/runtime.json",
  "infra/r2/kyc-docs.toml",
  "infra/r2/asset-images.toml",
  "infra/workers.manifest.json",
  "workers/push-dispatcher/wrangler.toml",
  "workers/api-stub/wrangler.toml",
  "workers/push-dispatcher/src/index.ts",
  "workers/marketing-capi-dispatcher/wrangler.toml",
  "tooling/deploy/cf-workers.cjs",
  ".github/workflows/deploy-cloudflare.yml",
];
for (const gone of [
  "infra/web/wrangler.toml",
  "infra/ops/wrangler.toml",
  "workers/web-proxy/wrangler.toml",
  "workers/ops-proxy/wrangler.toml",
  "tooling/deploy/cf-deploy-all.cjs",
]) {
  if (fs.existsSync(path.join(root, gone))) fails.push("must be removed: " + gone);
}

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const mcp = JSON.parse(fs.readFileSync(path.join(root, ".cursor/mcp.json"), "utf8"));
if (!mcp.mcpServers?.["cloudflare-docs"]?.url) {
  fails.push(".cursor/mcp.json: cloudflare-docs MCP missing");
}

if (fails.length) {
  console.error("[verify:cf-infra] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:cf-infra] PASS");
