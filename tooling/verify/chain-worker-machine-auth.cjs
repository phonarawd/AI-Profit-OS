"use strict";
const fs=require("fs"), path=require("path");
const root=path.resolve(__dirname,"../.."), fails=[];
const workers=["workers/chain-watchers/src/index.ts","workers/chain-sweeper/src/index.ts"];
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p)){fails.push("missing: "+rel);return "";}return fs.readFileSync(p,"utf8");}
const helper=read("workers/_shared/chain-machine-auth.ts");
for(const n of ["CHAIN_WORKER_TICK_TOKEN_UNAVAILABLE","CHAIN_WORKER_TICK_TOKEN_INVALID","WATCHER_INGEST_TOKEN_UNAVAILABLE","authorizeManualChainTick","requireWatcherIngestHeaders"]) if(!helper.includes(n)) fails.push("shared helper missing "+n);
for(const rel of workers){
  const src=read(rel);
  if(!src.includes('from "../../_shared/chain-machine-auth"')) fails.push(rel+" shared import missing");
  if(!src.includes("CHAIN_WORKER_TICK_TOKEN?: string")) fails.push(rel+" manual token env missing");
  const tick=src.indexOf('if (url.pathname === "/tick" && request.method === "POST")');
  if(tick<0) fails.push(rel+" tick route missing");
  else {
    const w=src.slice(tick,tick+600), a=w.indexOf("authorizeManualChainTick(request, env)"), r=w.indexOf("runTick(env)");
    if(a<0||r<0||a>r) fails.push(rel+" manual tick auth order invalid");
  }
  if(!src.includes("requireWatcherIngestHeaders(env)")) fails.push(rel+" outbound ingest token not required");
  if(/\.\.\.\(env\.WATCHER_INGEST_TOKEN\s*\?/.test(src)) fails.push(rel+" optional watcher token pattern forbidden");
  const scheduled=src.indexOf("async scheduled(");
  if(scheduled<0||!src.slice(scheduled,scheduled+300).includes("await runTick(env)")) fails.push(rel+" scheduled direct tick missing");
}
const pkg=JSON.parse(read("package.json")||"{}");
if(!pkg.scripts?.["verify:chain-worker-machine-auth"]) fails.push("package script missing");
if(!read("tooling/verify/CATALOG.md").includes("chain-worker-machine-auth")) fails.push("catalog missing");
if(!read(".github/workflows/gate.yml").includes("verify:chain-worker-machine-auth")) fails.push("workflow gate missing");
if(!read("tooling/verify/gate.cjs").includes("chain-worker-machine-auth.cjs")) fails.push("local gate missing");
if(fails.length){console.error("[verify:chain-worker-machine-auth] FAIL");for(const f of fails)console.error("  - "+f);process.exit(1);}
console.log("[verify:chain-worker-machine-auth] PASS (2 chain workers · manual tick fail-closed · outbound ingest token required · cron preserved)");
