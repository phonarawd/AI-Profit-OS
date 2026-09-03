"use strict";
const fs=require("fs"), path=require("path");
const root=path.resolve(__dirname,"../.."), fails=[];
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p)){fails.push("missing: "+rel);return "";}return fs.readFileSync(p,"utf8");}
const health=read("services/api-nest/src/health.controller.ts");
const env=read("services/api-nest/src/config/phase0.env.ts");
const auth=read("services/api-nest/src/auth/auth.service.ts");
function assertPreflightBefore(methodNeedle, sideEffectNeedle){
  const start=auth.indexOf(methodNeedle);
  const side=start>=0?auth.indexOf(sideEffectNeedle,start):-1;
  const pre=start>=0?auth.indexOf("this.requireUserSessionMintSecret();",start):-1;
  if(start<0||side<0||pre<0||pre>side){
    fails.push("session-mint preflight must precede side effect: "+methodNeedle+" -> "+sideEffectNeedle);
  }
}
for(const [method,side] of [
  ['oauthStart(providerRaw: string)', "this.oauthIdentity.startReady"],
  ["async oauthCallback(", "this.oauthIdentity.prove"],
  ['passkeyOptions(kind: "register" | "authenticate")', "this.webauthn.options"],
  ["async passkeyRegisterVerify(", 'this.webauthn.prove("register"'],
  ["async passkeyAuthVerify(", 'this.webauthn.prove("authenticate"'],
  ["magicLinkRequest(body:", "this.magicLink.request"],
  ["async magicLinkVerify(", "this.magicLink.prove"],
  ["async refresh(", "await this.revokeSession(sessionUser)"],
]) assertPreflightBefore(method,side);
if(!auth.includes("private requireUserSessionMintSecret(): string")) fails.push("session mint secret preflight helper missing");
function methodSlice(startNeedle,endNeedle){
  const start=auth.indexOf(startNeedle);
  const end=start>=0?auth.indexOf(endNeedle,start):-1;
  return start>=0&&end>start?auth.slice(start,end):"";
}
for(const [start,end] of [
  ["async oauthCallback(", "passkeyOptions("],
  ["async passkeyRegisterVerify(", "async passkeyAuthVerify("],
  ["async magicLinkVerify(", "logout(sessionUser"],
]){
  const s=methodSlice(start,end);
  const profile=s.indexOf("await this.upsertStageAProfile");
  const provision=s.indexOf("await this.provisionLedgerBucketsForUser(userId)");
  const mint=Math.max(s.indexOf("await this.mintSession(userId)"),s.indexOf("return this.sessionMintView(userId)"));
  if(profile<0||provision<0||mint<0||profile>provision||provision>mint){
    fails.push("new-user auth must persist profile -> repair onboarding invariants -> mint: "+start);
  }
}
const passAuthSlice=methodSlice("async passkeyAuthVerify(", "magicLinkRequest(");
if(
  passAuthSlice.indexOf("await this.provisionLedgerBucketsForUser(userId)")<0 ||
  passAuthSlice.indexOf("await this.provisionLedgerBucketsForUser(userId)") >
    passAuthSlice.indexOf("return this.sessionMintView(userId)")
) fails.push("passkey auth must repair onboarding invariants before mint");

if(!/const jwtUserSecret = this\.requireUserSessionMintSecret\(\);[\s\S]{0,500}jwtCore\.sign\(\{ sub: userId \}, jwtUserSecret,/.test(auth)){
  fails.push("mintSession must use the same preflighted strong secret");
}

for(const n of [
  "auth: {",
  "userJwtConfigured: isUserJwtSecretStrong(env.jwtUserSecret)",
  'kakaoConfigured: oauthConfigured(env, "kakao")',
  "resendConfigured: Boolean(env.resendApiKey && env.resendFromEmail)",
]) if(!health.includes(n)) fails.push("health readiness missing "+n);
if(!env.includes('jwtUserSecret: read("JWT_USER_SECRET")')) fails.push("JWT_USER_SECRET env binding missing");
for(const n of [
  "USER_JWT_SECRET_MIN_BYTES = 32",
  'Buffer.byteLength(secret, "utf8") >= USER_JWT_SECRET_MIN_BYTES',
]) if(!env.includes(n)) fails.push("JWT HS256 minimum-strength contract missing "+n);
if(/jwtUserSecret\s*[:=]\s*["'][^"']+["']/.test(health)) fails.push("health must never expose or hardcode JWT secret");
if(/resendApiKey\s*:\s*env\.resendApiKey/.test(health)) fails.push("health must never return Resend API key");
if(/oauthKakaoClientSecret\s*:\s*env\.oauthKakaoClientSecret/.test(health)) fails.push("health must never return Kakao client secret");
const pkg=JSON.parse(read("package.json")||"{}");
if(!pkg.scripts?.["verify:auth-runtime-readiness"]) fails.push("package script missing");
if(!read("tooling/verify/CATALOG.md").includes("auth-runtime-readiness")) fails.push("catalog missing");
if(!read(".github/workflows/gate.yml").includes("verify:auth-runtime-readiness")) fails.push("workflow gate missing");
if(!read("tooling/verify/gate.cjs").includes("auth-runtime-readiness.cjs")) fails.push("local gate missing");
if(fails.length){console.error("[verify:auth-runtime-readiness] FAIL");for(const f of fails)console.error("  - "+f);process.exit(1);}

const runtime = require("node:child_process").spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "services/api-nest/src/config/phase0.env.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30000 },
);
process.stdout.write(runtime.stdout || "");
process.stderr.write(runtime.stderr || "");
if(runtime.status!==0){
  console.error("[verify:auth-runtime-readiness] JWT strength runtime selftest failed");
  process.exit(1);
}
console.log("[verify:auth-runtime-readiness] PASS (JWT >=256-bit · proof preflight · profile-before-practice · idempotent onboarding repair before mint)");

