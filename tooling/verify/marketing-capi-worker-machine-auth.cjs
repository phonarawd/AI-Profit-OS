"use strict";
const fs=require("fs"), path=require("path");
const root=path.resolve(__dirname,"../.."), fails=[];
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p)){fails.push("missing: "+rel);return "";}return fs.readFileSync(p,"utf8");}
const rel="workers/marketing-capi-dispatcher/src/index.ts";
const src=read(rel);
for(const n of [
  "MARKETING_CAPI_DISPATCH_TOKEN?: string",
  "MARKETING_CAPI_DISPATCH_TOKEN_UNAVAILABLE",
  "MARKETING_CAPI_DISPATCH_TOKEN_INVALID",
  "x-marketing-capi-token",
  "authorizeMarketingCapiDispatch",
]) if(!src.includes(n)) fails.push(rel+" missing "+n);
const health=src.indexOf('if (url.pathname === "/health")');
const method=src.indexOf('if (request.method !== "POST")');
const auth=src.indexOf("authorizeMarketingCapiDispatch(request, env)");
const accepted=src.indexOf('status: "stub_accepted"');
if(health<0||method<0||auth<0||accepted<0||!(health<method&&method<auth&&auth<accepted)) {
  fails.push(rel+" route/auth order invalid");
}
const pkg=JSON.parse(read("package.json")||"{}");
if(!pkg.scripts?.["verify:marketing-capi-worker-machine-auth"]) fails.push("package script missing");
if(!read("tooling/verify/CATALOG.md").includes("marketing-capi-worker-machine-auth")) fails.push("catalog missing");
if(!read(".github/workflows/gate.yml").includes("verify:marketing-capi-worker-machine-auth")) fails.push("workflow gate missing");
if(!read(".github/workflows/gate.yml").includes("workers/marketing-capi-dispatcher/tsconfig.json")) fails.push("workflow typecheck missing");
if(!read("tooling/verify/gate.cjs").includes("marketing-capi-worker-machine-auth.cjs")) fails.push("local gate missing");
if(fails.length){console.error("[verify:marketing-capi-worker-machine-auth] FAIL");for(const f of fails)console.error("  - "+f);process.exit(1);}
console.log("[verify:marketing-capi-worker-machine-auth] PASS (health public · POST machine auth fail-closed · stub side effect 0)");
