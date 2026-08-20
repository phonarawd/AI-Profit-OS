/**
 * verify:complete-profile-closure — REL-103
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

const runtime = fs.readFileSync(
  path.join(root, "apps/web/app/auth/complete-profile/CompleteProfileRuntime.tsx"),
  "utf8",
);
if (!runtime.includes("patchAuthProfile")) fail("profile must PATCH the server");
if (/성별|gender/.test(runtime)) fail("complete-profile must not branch on gender");

const sdk = fs.readFileSync(
  path.join(root, "packages/sdk/src/auth/fetch.ts"),
  "utf8",
);
if (!sdk.includes("/api/v1/auth/profile")) {
  fail("SDK must PATCH /api/v1/auth/profile");
}

function finish() {
  if (fails.length) {
    console.error("[verify:complete-profile-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[verify:complete-profile-closure] PASS (Stage B PATCH · gender 0)");
}

const { runAxeOnHtml, blockingViolations } = require("../e2e/lib/axe-scan.cjs");
const html = `<!doctype html><html lang="ko"><head><title>프로필</title></head>
  <body>
    <main>
      <h1>기본 정보만 남겨 주세요</h1>
      <form>
        <label>이름<input name="displayName" /></label>
        <label>휴대폰 번호<input name="phone" type="tel" /></label>
        <label>생년월일<input name="birthDate" type="date" /></label>
        <button type="submit">저장하고 계속</button>
      </form>
    </main>
  </body></html>`;
runAxeOnHtml(html)
  .then((results) => {
    if (blockingViolations(results).length) {
      fail("complete-profile axe fixture has blocking violations");
    }
    finish();
  })
  .catch((err) => {
    fail(`axe run error: ${err.message}`);
    finish();
  });
