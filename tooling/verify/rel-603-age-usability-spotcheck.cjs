#!/usr/bin/env node
/**
 * verify:rel-603-age-usability-spotcheck
 * REL-603 automated cohort usability on staging preview only.
 * Human participants 0 · MCP-only evidence 0 · production mutation 0.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
/** CodeQL: fixture→fetch taint 차단 — 상수 origin만 네트워크 사용 */
const STAGING_WEB_ORIGIN =
  "https://ai-profit-web-preview.ebay-adapter.workers.dev";
const ALLOWED_SCENARIO_PATHS = Object.freeze({
  S1: "/auth/signup",
  S2: "/profits",
  S3: "/profits",
  S4: "/wallet",
});

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    fails.push(rel + " invalid JSON: " + e.message);
    return {};
  }
}

const fixture = readJson("tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const evidence = read("governance/release-master/AGE_SPOTCHECK.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const readme = read("tooling/e2e/README.md");
const pwSpec = read(
  fixture.playwrightSpec ||
    "tooling/e2e/specs/rel-603-age-usability-spotcheck.spec.cjs",
);

function todoStatus(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp(
    "- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)",
  );
  const m = plan.match(re);
  return m ? m[1] : "";
}

function yamlCompleted(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return false;
  return /STATUS:\s*COMPLETED/.test(plan.slice(idx, idx + 320));
}

function expectFixtureZero(key) {
  if (fixture[key] !== 0) {
    fails.push("fixture " + key + " must be 0");
  }
}

if (fixture.rel !== "REL-603") fails.push("fixture rel must be REL-603");
if (fixture.status !== "COMPLETED") fails.push("fixture status must be COMPLETED");
if (fixture.automationLevel !== "A2") fails.push("fixture automationLevel must be A2");
if (fixture.playwrightApiIsolation !== "qa-stubs") {
  fails.push("fixture playwrightApiIsolation must be qa-stubs");
}
if (fixture.automatedCohortRunsRequired !== 9) {
  fails.push("fixture automatedCohortRunsRequired must be 9");
}
if (fixture.acceptanceMet !== 1) fails.push("fixture acceptanceMet must be 1");
if (fixture.automatedCohortExecuted !== 1) {
  fails.push("fixture automatedCohortExecuted must be 1");
}

for (const key of [
  "humanParticipantsRequired",
  "mcpOnlyDone",
  "fakePass",
  "productionDomainMutation",
  "productionDbMutation",
  "productionWorkflowDispatch",
  "moneyMutation",
  "homeVisualRedesign",
  "protectedScopeMutation",
  "participatePostRequestsExpected",
]) {
  expectFixtureZero(key);
}

const cohorts = fixture.cohorts || [];
if (cohorts.length !== fixture.automatedCohortRunsRequired) {
  fails.push("cohort count must match automatedCohortRunsRequired");
}
const cohortIds = cohorts.map((c) => c.id);
if (new Set(cohortIds).size !== cohortIds.length) {
  fails.push("cohort ids must be unique");
}
const expectedBands = { "20s": 3, "40s": 3, "60-70s": 3 };
for (const [band, expected] of Object.entries(expectedBands)) {
  const actual = cohorts.filter((c) => c.ageBand === band).length;
  if (actual !== expected) {
    fails.push("age band " + band + " must have " + expected + " cohorts");
  }
}
for (const cohort of cohorts) {
  if (
    !cohort.viewport ||
    !Number.isInteger(cohort.viewport.width) ||
    !Number.isInteger(cohort.viewport.height)
  ) {
    fails.push("cohort " + cohort.id + " must have integer viewport width/height");
  }
}

const scenarios = fixture.scenarios || [];
const expectedScenarioAssertions = {
  S1: "signup-form-terms-gate-no-submit",
  S2: "opportunity-card-ready",
  S3: "card-detail-preflight-sheet-no-participate-post",
  S4: "wallet-ready-read-ctas",
};
const scenarioIds = scenarios.map((s) => s.id);
if (JSON.stringify(scenarioIds) !== JSON.stringify(["S1", "S2", "S3", "S4"])) {
  fails.push("REL-603 scenarios must be exactly S1,S2,S3,S4 in order");
}
for (const scenario of scenarios) {
  if (scenario.browserAssertion !== expectedScenarioAssertions[scenario.id]) {
    fails.push("scenario " + scenario.id + " browserAssertion mismatch");
  }
}

for (const dep of fixture.deps || []) {
  if (todoStatus(dep) !== "completed") fails.push("dependency todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("dependency YAML not COMPLETED " + dep);
}

for (const needle of [
  "AUTOMATION_LEVEL = A2",
  "AUTOMATED_COHORT = 1",
  "HUMAN_EXECUTED = 0",
  "HUMAN_PARTICIPANTS_REQUIRED = 0",
  "FAKE_PASS = 0",
  "MCP_ONLY_DONE = 0",
  "PRODUCTION_DOMAIN_MUTATION = 0",
  "PRODUCTION_DB_MUTATION = 0",
  "PRODUCTION_WORKFLOW_DISPATCH = 0",
  "MONEY_MUTATION = 0",
  "HOME_VISUAL_REDESIGN = 0",
  "PROTECTED_SCOPE_MUTATION = 0",
  "PARTICIPATE_POST_REQUESTS = 0",
]) {
  if (!evidence.includes(needle)) fails.push("evidence missing " + needle);
}
if (evidence.includes("HUMAN_BLOCK")) {
  fails.push("evidence must not stay HUMAN_BLOCK under automated REL-603");
}

if (!pkg.includes("verify:rel-603-age-usability-spotcheck")) {
  fails.push("package.json missing verify:rel-603-age-usability-spotcheck");
}
if (!catalog.includes("rel-603-age-usability-spotcheck")) {
  fails.push("CATALOG missing rel-603-age-usability-spotcheck");
}
if (!gate.includes("verify:rel-603-age-usability-spotcheck")) {
  fails.push("gate.yml missing REL-603 verify step");
}
if (!domain.includes("rel-603-age-usability-spotcheck.cjs")) {
  fails.push("domain-by-path missing REL-603");
}
if (!readme.includes("REL-603")) fails.push("e2e README must document REL-603");

for (const needle of [
  "REL-603",
  "stubGuestApis",
  "stubOpportunityFeed",
  "stubOpportunityRoom",
  "stubWallet",
  "auth-email-submit",
  "data-requires-preflight='true'",
  "preflightRequests",
  "participateRequests",
  "participatePostRequestsExpected",
  "wallet-home",
]) {
  if (!pwSpec.includes(needle)) fails.push("playwright spec missing " + needle);
}

const closed = yamlCompleted("REL-603") || todoStatus("REL-603") === "completed";
const rel700Closed = yamlCompleted("REL-700") || todoStatus("REL-700") === "completed";
const rel701PreClosed =
  yamlCompleted("REL-701-PRE") || todoStatus("REL-701-PRE") === "completed";
if (closed) {
  if (todoStatus("REL-603") !== "completed") fails.push("rel-603 todo must be completed");
  if (!yamlCompleted("REL-603")) fails.push("REL-603 YAML must be COMPLETED");
  if (rel700Closed && rel701PreClosed) {
    if (!plan.includes("FIRST_EXECUTION_TODO = REL-701-DB")) {
      fails.push("FIRST_EXECUTION_TODO must advance to REL-701-DB after REL-701-PRE");
    }
    if (!plan.includes("LAST_COMPLETED_TODO = REL-701-PRE")) {
      fails.push("LAST_COMPLETED_TODO must be REL-701-PRE");
    }
  } else if (!plan.includes("FIRST_EXECUTION_TODO = REL-700")) {
    fails.push("FIRST_EXECUTION_TODO must advance to REL-700");
  } else if (!plan.includes("LAST_COMPLETED_TODO = REL-603")) {
    fails.push("LAST_COMPLETED_TODO must be REL-603");
  }
  if (!plan.includes("HARD_STOP_AFTER = REL-603")) {
    fails.push("HARD_STOP_AFTER must be REL-603");
  }
  for (const needle of [
    "STATUS = COMPLETED",
    "ACCEPTANCE_MET = 1",
    "AUTOMATED_COHORT_EXECUTED = 1",
    "COHORT_RUNS_COMPLETE = 9",
    "FAKE_PASS = 0",
    fixture.stagingWeb,
  ]) {
    if (!evidence.includes(needle)) fails.push("evidence missing " + needle);
  }
}

async function liveScenario(scenario) {
  if (fixture.stagingWeb !== STAGING_WEB_ORIGIN) {
    fails.push("staging web must equal locked preview origin");
    return;
  }
  const pathPart = ALLOWED_SCENARIO_PATHS[scenario.id];
  if (!pathPart || pathPart !== String(scenario.path || "")) {
    fails.push("scenario path must equal locked allowlist for " + scenario.id);
    return;
  }
  const url = STAGING_WEB_ORIGIN + pathPart;
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-603-verify/1" },
  });
  const statuses = scenario.expectStatus || [200];
  if (!statuses.includes(res.status)) {
    fails.push("live FAIL " + scenario.id + " status=" + res.status + " url=" + url);
    return;
  }
  if (res.status >= 200 && res.status < 400) {
    const html = await res.text();
    const lower = html.toLowerCase();
    for (const token of fixture.forbiddenTokens || []) {
      if (lower.includes(String(token).toLowerCase())) {
        fails.push("live FAIL " + scenario.id + " forbidden token " + token);
      }
    }
    const ok = (scenario.mustIncludeAny || []).some((n) =>
      lower.includes(String(n).toLowerCase()),
    );
    if (!ok) fails.push("live FAIL " + scenario.id + " missing expected markers");
  }
  console.log(
    "[verify:rel-603-age-usability-spotcheck] live PASS " +
      scenario.id +
      " " +
      res.status,
  );
}

function runPlaywright() {
  // Phase0 저사양 로컬: Playwright 풀 코호트는 CI가 증명한다 (CI=true면 절대 skip 불가).
  if (process.env.CI !== "true" && process.env.AIPO_LOWSPEC_SKIP_HEAVY === "1") {
    console.log(
      "[verify:rel-603-age-usability-spotcheck] BLOCKED_LOCAL_ENVIRONMENT skip playwright · CI must prove",
    );
    return;
  }
  const specPath = path.join(root, fixture.playwrightSpec);
  if (!fs.existsSync(specPath)) {
    fails.push("missing playwright spec " + fixture.playwrightSpec);
    return;
  }
  const run = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "--config=tooling/e2e/playwright.config.cjs",
      fixture.playwrightSpec,
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 600_000,
      env: {
        ...process.env,
        CI: "true",
        REL603_STAGING_WEB: STAGING_WEB_ORIGIN,
      },
      shell: process.platform === "win32",
    },
  );
  if (run.status !== 0) {
    if (run.stdout) console.error(run.stdout);
    if (run.stderr) console.error(run.stderr);
    fails.push("playwright FAIL exit=" + String(run.status));
  } else {
    console.log(
      "[verify:rel-603-age-usability-spotcheck] playwright PASS 9 cohorts x 4 scenarios",
    );
  }
}

(async function main() {
  if (fails.length === 0) {
    try {
      for (const scenario of scenarios) {
        await liveScenario(scenario);
      }
    } catch (e) {
      fails.push("live fetch error: " + (e.message || e));
    }
  }

  if (fails.length === 0) {
    runPlaywright();
  }

  if (fails.length === 0) {
    for (const script of fixture.extraVerifies || []) {
      const run = spawnSync(
        process.execPath,
        [path.join(root, "tooling/verify", script)],
        {
          cwd: root,
          encoding: "utf8",
          timeout: 180_000,
          env: { ...process.env, CI: "true" },
        },
      );
      if (run.status !== 0) {
        fails.push(
          "re-run FAIL " +
            script +
            ": " +
            String(run.stderr || run.stdout || "").split("\n")[0],
        );
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-603-age-usability-spotcheck] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log(
      "[verify:rel-603-age-usability-spotcheck] PASS (9 automated cohorts · staging UI · QA-isolated APIs · human 0 · participate POST 0)",
    );
  } else {
    console.log(
      "[verify:rel-603-age-usability-spotcheck] PASS (wiring + live + playwright · close pending)",
    );
  }
})();
