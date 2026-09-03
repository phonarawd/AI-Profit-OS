"use strict";
const fs=require("fs"), path=require("path");
const root=path.resolve(__dirname,"../.."), fails=[];
const workers=["workers/ebay-adapter/src/index.ts","workers/amazon-adapter/src/index.ts","workers/yahoo-jp-adapter/src/index.ts","workers/pokemontcg-adapter/src/index.ts","workers/ygoprodeck-adapter/src/index.ts","workers/coingecko-adapter/src/index.ts","workers/frankfurter-adapter/src/index.ts"];
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p)){fails.push("missing: "+rel);return "";}return fs.readFileSync(p,"utf8");}
const helper=read("workers/_shared/adapter-machine-auth.ts");
for(const n of ["ADAPTER_INGEST_TOKEN_UNAVAILABLE","ADAPTER_INGEST_TOKEN_INVALID","authorizeManualAdapterTick","requireAdapterIngestHeaders"]) if(!helper.includes(n)) fails.push("shared helper missing "+n);
for(const rel of workers){
  const src=read(rel);
  if(!src.includes('from "../../_shared/adapter-machine-auth"')) fails.push(rel+" shared import missing");
  const tick=src.indexOf('if (url.pathname === "/tick" && request.method === "POST")');
  if(tick<0) fails.push(rel+" tick route missing");
  else {
    const w=src.slice(tick,tick+500), a=w.indexOf("authorizeManualAdapterTick(request, env)"), r=w.indexOf("runTick(env)");
    if(a<0||r<0||a>r) fails.push(rel+" manual tick auth order invalid");
  }
  if(!src.includes("headers: requireAdapterIngestHeaders(env)")) fails.push(rel+" ingest token header not required");
  if(/\.\.\.\(env\.ADAPTER_INGEST_TOKEN\s*\?/.test(src)) fails.push(rel+" optional ingest token pattern forbidden");
}
const coingecko=read("workers/coingecko-adapter/src/index.ts");
const frankfurter=read("workers/frankfurter-adapter/src/index.ts");
if(!coingecko.includes("env.COINGECKO_DEMO_API_KEY && env.ADAPTER_INGEST_TOKEN")) fails.push("CoinGecko health readiness must require provider key + ingest token");
if(!frankfurter.includes("credentialsConfigured: Boolean(env.ADAPTER_INGEST_TOKEN)")) fails.push("Frankfurter health readiness must require ingest token");
const pkg=JSON.parse(read("package.json")||"{}");
if(!pkg.scripts?.["verify:adapter-worker-machine-auth"]) fails.push("package script missing");
if(!read("tooling/verify/CATALOG.md").includes("adapter-worker-machine-auth")) fails.push("catalog missing");
if(!read(".github/workflows/gate.yml").includes("verify:adapter-worker-machine-auth")) fails.push("gate missing");
if(fails.length){console.error("[verify:adapter-worker-machine-auth] FAIL");for(const f of fails)console.error("  - "+f);process.exit(1);}
console.log("[verify:adapter-worker-machine-auth] PASS (7 adapters · manual tick auth · ingest token required)");
