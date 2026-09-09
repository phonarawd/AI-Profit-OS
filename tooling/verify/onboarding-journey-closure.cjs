/**
 * verify:onboarding-journey-closure — product onboarding 7/7
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

const flow = fs.readFileSync(
  path.join(root, "packages/ui/components/onboarding/OnboardingFlow.tsx"),
  "utf8",
);
if (!flow.includes("OnboardingShell") || !flow.includes("SettlementTimeline")) {
  fail("onboarding must keep product shell + settlement timeline");
}
if (flow.includes("/wallet/deposit")) {
  fail("onboarding must not use a deposit funnel CTA");
}
if (/\+\$/.test(flow)) fail("onboarding must not tease +$ profit");
if (flow.includes("GuestChrome")) fail("onboarding must not reuse GuestChrome");

const experiential = spawnSync(
  process.execPath,
  [path.join(root, "tooling/verify/onboarding-experiential.cjs")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(experiential.stdout || "");
process.stderr.write(experiential.stderr || "");
if (experiential.status !== 0) fail("onboarding-experiential failed");

function finish() {
  if (fails.length) {
    console.error("[verify:onboarding-journey-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:onboarding-journey-closure] PASS (7-step · virtual example · Home CTA)",
  );
}

const { runAxeOnHtml, blockingViolations } = require("../e2e/lib/axe-scan.cjs");
const html = `<!doctype html><html lang="ko"><head><title>시작</title></head>
  <body>
    <main>
      <h1>퍼뜩 AI가 전 세계 가격을 모아요</h1>
      <p>1/7 단계</p>
      <button type="button">다음</button>
    </main>
  </body></html>`;
runAxeOnHtml(html)
  .then((results) => {
    if (blockingViolations(results).length) {
      fail("onboarding axe fixture has blocking violations");
    }
    finish();
  })
  .catch((err) => {
    fail(`axe run error: ${err.message}`);
    finish();
  });
