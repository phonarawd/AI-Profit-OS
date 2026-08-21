/**
 * verify:onboarding-journey-closure — Automation Story + durable gate
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
if (!flow.includes("OnboardingStoryVisual")) {
  fail("onboarding must render Automation Story visual");
}
if (flow.includes("DemoWalletBanner") || flow.includes("tone-young")) {
  fail("onboarding must not keep superseded demo/tone-first experience");
}
if (flow.includes("/wallet/deposit")) {
  fail("onboarding must not use a deposit funnel CTA");
}
if (/\+\$/.test(flow)) fail("onboarding must not tease +$ profit");

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
    "[verify:onboarding-journey-closure] PASS (automation story · durable gate)",
  );
}

const { runAxeOnHtml, blockingViolations } = require("../e2e/lib/axe-scan.cjs");
const html = `<!doctype html><html lang="ko"><head><title>시작</title></head>
  <body>
    <main>
      <h1>전 세계 시세차익 기회, 퍼뜩 AI가 먼저 찾아요</h1>
      <nav aria-label="안내 단계">
        <ol>
          <li aria-current="step">1 탐색</li>
          <li>2 매칭</li>
        </ol>
      </nav>
      <button type="button">자동 매칭 보기</button>
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
