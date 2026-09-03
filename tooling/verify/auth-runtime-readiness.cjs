"use strict";
const fs=require("fs"), path=require("path");
const root=path.resolve(__dirname,"../.."), fails=[];
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p)){fails.push("missing: "+rel);return "";}return fs.readFileSync(p,"utf8");}
const health=read("services/api-nest/src/health.controller.ts");
const env=read("services/api-nest/src/config/phase0.env.ts");
for(const n of [
  "auth: {",
  "userJwtConfigured: Boolean(env.jwtUserSecret)",
  'kakaoConfigured: oauthConfigured(env, "kakao")',
  "resendConfigured: Boolean(env.resendApiKey && env.resendFromEmail)",
]) if(!health.includes(n)) fails.push("health readiness missing "+n);
if(!env.includes('jwtUserSecret: read("JWT_USER_SECRET")')) fails.push("JWT_USER_SECRET env binding missing");
if(/jwtUserSecret\s*[:=]\s*["'][^"']+["']/.test(health)) fails.push("health must never expose or hardcode JWT secret");
if(/resendApiKey\s*:\s*env\.resendApiKey/.test(health)) fails.push("health must never return Resend API key");
if(/oauthKakaoClientSecret\s*:\s*env\.oauthKakaoClientSecret/.test(health)) fails.push("health must never return Kakao client secret");
const pkg=JSON.parse(read("package.json")||"{}");
if(!pkg.scripts?.["verify:auth-runtime-readiness"]) fails.push("package script missing");
if(!read("tooling/verify/CATALOG.md").includes("auth-runtime-readiness")) fails.push("catalog missing");
if(!read(".github/workflows/gate.yml").includes("verify:auth-runtime-readiness")) fails.push("workflow gate missing");
if(!read("tooling/verify/gate.cjs").includes("auth-runtime-readiness.cjs")) fails.push("local gate missing");
if(fails.length){console.error("[verify:auth-runtime-readiness] FAIL");for(const f of fails)console.error("  - "+f);process.exit(1);}
console.log("[verify:auth-runtime-readiness] PASS (health exposes JWT/Kakao/Resend readiness booleans only · secret values never exposed)");
