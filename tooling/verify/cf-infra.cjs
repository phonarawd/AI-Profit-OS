/** verify:cf-infra — Cloudflare deploy scaffold present (Infra §15) */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const required = [
  ".cursor/mcp.json",
  "infra/hosts.manifest.json",
  "infra/web/wrangler.toml",
  "infra/ops/wrangler.toml",
  "infra/ops/access-policy.json",
  "infra/api/runtime.json",
  "infra/r2/kyc-docs.toml",
  "infra/workers.manifest.json",
  "workers/push-dispatcher/wrangler.toml",
  "workers/push-dispatcher/src/index.ts",
  "workers/marketing-capi-dispatcher/wrangler.toml",
  "tooling/deploy/cf-deploy-all.cjs",
  ".github/workflows/deploy-cloudflare.yml",
];

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
