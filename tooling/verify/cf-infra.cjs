/** verify:cf-infra — Cloudflare deploy scaffold present */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
const required = [
  ".cursor/mcp.json","infra/hosts.manifest.json","infra/domain.manifest.json",
  "tooling/deploy/cf-domain-bootstrap.cjs","infra/api/runtime.json",
  "infra/r2/kyc-docs.toml","infra/r2/asset-images.toml","infra/workers.manifest.json",
  "workers/push-dispatcher/wrangler.toml","workers/api-stub/wrangler.toml",
  "workers/push-dispatcher/src/index.ts","workers/marketing-capi-dispatcher/wrangler.toml",
  "tooling/deploy/cf-workers.cjs",".github/workflows/deploy-cloudflare.yml"
];
for (const gone of ["infra/web/wrangler.toml","infra/ops/wrangler.toml","workers/web-proxy/wrangler.toml","workers/ops-proxy/wrangler.toml","tooling/deploy/cf-deploy-all.cjs"]) {
  if (fs.existsSync(path.join(root,gone))) fails.push("must be removed: "+gone);
}
for (const rel of required) if (!fs.existsSync(path.join(root,rel))) fails.push("missing: "+rel);
const domain=JSON.parse(fs.readFileSync(path.join(root,"infra/domain.manifest.json"),"utf8"));
const roles=domain.domainRoles||{};
if(domain.rootDomain!=="putduk.com") fails.push("domain.manifest rootDomain must be putduk.com");
if(domain.cloudflare?.accountId!=="9dc502d4ef06b3b5374591de6e6933ca") fails.push("Cloudflare account must be the putduk.com zone account");
if(domain.cloudflare?.zoneId!=="c9e6c93451c3c2e107a1eca511bedaba") fails.push("Cloudflare zone must be putduk.com");
if(!roles.userWeb?.includes("putduk.com")||!roles.userWeb?.includes("www.putduk.com")) fails.push("userWeb must include putduk.com and www.putduk.com");
if(roles.userWebOwner!=="putduk-web") fails.push("domainRoles.userWebOwner must be putduk-web");
if(roles.landingOnly?.includes("putduk.com")) fails.push("putduk.com must not be landingOnly");
if(!domain.bridgeWorkers?.["api-stub"]) fails.push("domain.manifest bridgeWorkers api-stub required");
if(!String(domain.bridgeWorkers["api-stub"].target||"").includes("ai-profit-os.onrender.com")) fails.push("api-stub target must stay Render Production");
if((domain.forbiddenDeploy||[]).some(x=>String(x).includes("wrangler pages deploy"))===false) fails.push("manifest forbiddenDeploy must include wrangler pages deploy");
if(fails.length){console.error("[verify:cf-infra] FAIL\n- "+fails.join("\n- "));process.exit(1);}
console.log("[verify:cf-infra] PASS");
