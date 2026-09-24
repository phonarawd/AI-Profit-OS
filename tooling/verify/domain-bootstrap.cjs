/**
 * verify:domain-bootstrap — PUTDUK Cloudflare domain SSOT
 */
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),fails=[];
const readJson=rel=>{const p=path.join(root,rel);if(!fs.existsSync(p)){fails.push("missing: "+rel);return null;}return JSON.parse(fs.readFileSync(p,"utf8"));};
const manifest=readJson("infra/domain.manifest.json");
const env=fs.existsSync(path.join(root,".env.example"))?fs.readFileSync(path.join(root,".env.example"),"utf8"):"";
if(manifest){
 if(manifest.rootDomain!=="putduk.com") fails.push("rootDomain must be putduk.com");
 if(manifest.cloudflare?.accountId!=="9dc502d4ef06b3b5374591de6e6933ca") fails.push("cloudflare accountId must be the putduk.com zone account");
 if(manifest.cloudflare?.zoneId!=="c9e6c93451c3c2e107a1eca511bedaba") fails.push("cloudflare zoneId must be putduk.com");
 for(const [k,v] of Object.entries(manifest.env||{})) if(typeof v!=="string"||!v.includes("putduk.com")) fails.push("env."+k+" must reference putduk.com");
 if(!manifest.bridgeWorkers?.["api-stub"]) fails.push("api-stub required");
 if(!String(manifest.bridgeWorkers["api-stub"].target||"").includes("onrender.com")) fails.push("api-stub target must stay Render");
 if(!(manifest.domainRoles?.userWeb||[]).includes("putduk.com")) fails.push("putduk.com must be userWeb");
 if(!(manifest.domainRoles?.userWeb||[]).includes("www.putduk.com")) fails.push("www.putduk.com must be userWeb");
 if(manifest.domainRoles?.userWebOwner!=="putduk-web") fails.push("userWebOwner must be putduk-web");
}
if(env&&!env.includes("ROOT_DOMAIN=putduk.com")) fails.push(".env.example must document ROOT_DOMAIN=putduk.com");
const tomlPath=path.join(root,"workers/api-stub/wrangler.toml");
const toml=fs.readFileSync(tomlPath,"utf8");
if(!toml.includes("account_id = \"9dc502d4ef06b3b5374591de6e6933ca\"")) fails.push("api stub account_id must be putduk.com zone account");
if(fails.length){console.error("[verify:domain-bootstrap] FAIL\n- "+fails.join("\n- "));process.exit(1);}
console.log("[verify:domain-bootstrap] PASS (putduk.com Cloudflare SSOT)");
