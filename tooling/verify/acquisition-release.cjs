/**
 * verify:acquisition-release — REL-101~104 재확인 게이트
 * Canon Auth/Onboarding 유지. PendingFigma 강요 0. Kakao live NOT_RUN 위조 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

function runNode(rel, args = []) {
  const r = spawnSync(process.execPath, [path.join(root, rel), ...args], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  return r.status === 0;
}

const required = [
  "packages/sdk/src/auth/fetch.ts",
  "packages/sdk/src/auth/auth-release.test.ts",
  "apps/web/app/auth/signup/SignupRuntime.tsx",
  "governance/consumer-acquisition/acquisition-release.v1.json",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const release = readJson("governance/consumer-acquisition/acquisition-release.v1.json");
if (release) {
  if (release.e2e?.liveKakaoHumanE2e !== "NOT_RUN") {
    fail("liveKakaoHumanE2e must stay NOT_RUN");
  }
  if (release.authority?.LIVE_KAKAO_HUMAN_E2E !== "NOT_RUN") {
    fail("authority.LIVE_KAKAO_HUMAN_E2E must stay NOT_RUN");
  }
  if (release.authority?.GENDER_FIELD !== "FORBIDDEN") {
    fail("GENDER_FIELD must stay FORBIDDEN");
  }
}

for (const rel of [
  "apps/web/app/auth/login/page.tsx",
  "apps/web/app/auth/signup/page.tsx",
  "apps/web/app/auth/complete-profile/page.tsx",
  "apps/web/app/onboarding/page.tsx",
]) {
  const src = read(rel);
  if (!src.includes("GuestChrome")) fail(`${rel} must keep GuestChrome`);
  if (/HomeDesktop|HomeMobile|spark-dash-home/.test(src)) {
    fail(`${rel} must not copy Home geometry`);
  }
  if (src.includes("12.50") || /Math\.random/.test(src)) {
    fail(`${rel} must not invent money or RNG`);
  }
}

const signup = read("apps/web/app/auth/signup/SignupRuntime.tsx");
if (!signup.includes("startKakaoOAuth") || !signup.includes("signupStageA")) {
  fail("signup runtime must call Nest signup via SDK");
}

const profile = read("apps/web/app/auth/complete-profile/CompleteProfileRuntime.tsx");
if (!profile.includes("patchAuthProfile")) {
  fail("complete-profile must PATCH Nest profile");
}

const onboarding = read("apps/web/app/onboarding/page.tsx");
if (!onboarding.includes("OnboardingFlow")) {
  fail("onboarding page must keep OnboardingFlow");
}

const sdkPkg = readJson("packages/sdk/package.json");
if (sdkPkg && sdkPkg.exports?.["./auth"] !== "./src/auth/index.ts") {
  fail("packages/sdk must export ./auth");
}

if (process.env.ACQUISITION_RELEASE_NESTED !== "1") {
  for (const script of [
    "tooling/verify/auth-surfaces.cjs",
  ]) {
    if (!runNode(script)) fail(`prereq ${script} failed`);
  }
  const sdkTest = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      "packages/sdk/src/auth/auth-release.test.ts",
    ],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(sdkTest.stdout || "");
  process.stderr.write(sdkTest.stderr || "");
  if (sdkTest.status !== 0) fail("auth-release.test.ts failed");

}

function finish() {
  if (fails.length) {
    console.error("[verify:acquisition-release] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:acquisition-release] PASS (Canon auth wired · SDK session/Kakao/profile · Kakao live NOT_RUN)",
  );
}

if (process.env.ACQUISITION_RELEASE_NESTED === "1") {
  finish();
} else {
  const { runAxeOnHtml, blockingViolations } = require("../e2e/lib/axe-scan.cjs");
  const html = `<!doctype html><html lang="ko"><head><title>가입</title></head>
  <body>
    <main>
      <h1>퍼뜩 시작하기</h1>
      <label><input type="checkbox" />이용약관에 동의</label>
      <button type="button">카카오로 시작하기</button>
      <label>이메일<input type="email" /></label>
    </main>
  </body></html>`;
  runAxeOnHtml(html)
    .then((results) => {
      if (blockingViolations(results).length) {
        fail("signup axe fixture has blocking violations");
      }
      finish();
    })
    .catch((err) => {
      fail(`axe run error: ${err.message}`);
      finish();
    });
}
