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
const pwSpec = read(fixture.playwrightSpec || "tooling/e2e/specs/rel-603-age-usability-spotcheck.spec.cjs");

function todoStatus(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m ? m[1] : "";
}

function yamlCompleted(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return false;
  return /STATUS:\s*COMPLETED/.test(plan.slice(idx, idx + 320));
}

if (fixture.humanParticipantsRequired !== 0) {
  fails.push("fixture humanParticipantsRequired must be 0 for automated REL-603");
}
if (fixture.mcpOnlyDone !== 0) fails.push("MCP-only is not DONE");
if (fixture.productionDomainMutation !== 0) fails.push("productionDomainMutation must be 0");
if (fixture.moneyMutation !== 0) fails.push("moneyMutation must be 0");
if ((fixture.cohorts || []).length !== fixture.automatedCohortRunsRequired) {
  fails.push("cohort count must match automatedCohortRunsRequired");
}
if ((fixture.scenarios || []).length !== 4) fails.push("REL-603 requires 4 scenarios S1-S4");

for (const dep of fixture.deps || []) {
  if (todoStatus(dep) !== "completed") fails.push("dependency todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("dependency YAML not COMPLETED " + dep);
}

if (!evidence.includes("AUTOMATION_LEVEL = A2")) {
  fails.push("evidence must declare AUTOMATION_LEVEL A2");
}
if (!evidence.includes("AUTOMATED_COHORT = 1")) {
  fails.push("evidence must declare AUTOMATED_COHORT = 1");
}
if (evidence.includes("HUMAN_BLOCK")) {
  fails.push("evidence must not stay HUMAN_BLOCK under automated REL-603");
}
if (!evidence.includes("HUMAN_EXECUTED = 0")) {
  fails.push("evidence must keep HUMAN_EXECUTED = 0");
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
if (!pwSpec.includes("REL-603")) fails.push("playwright spec missing REL-603 marker");
if (!readme.includes("REL-603")) fails.push("e2e README must document REL-603");

const closed = yamlCompleted("REL-603") || todoStatus("REL-603") === "completed";
if (closed) {
  if (todoStatus("REL-603") !== "completed") fails.push("rel-603 todo must be completed");
  if (!yamlCompleted("REL-603")) fails.push("REL-603 YAML must be COMPLETED");
  if (!plan.includes("FIRST_EXECUTION_TODO = REL-700")) {
    fails.push("FIRST_EXECUTION_TODO must advance to REL-700");
  }
  if (!plan.includes("LAST_COMPLETED_TODO = REL-603")) {
    fails.push("LAST_COMPLETED_TODO must be REL-603");
  }
  if (!plan.includes("HARD_STOP_AFTER = REL-603")) {
    fails.push("HARD_STOP_AFTER must be REL-603");
  }
  if (fixture.status !== "COMPLETED") fails.push("fixture status must be COMPLETED");
  if (fixture.acceptanceMet !== 1) fails.push("fixture acceptanceMet must be 1");
  if (fixture.automatedCohortExecuted !== 1) fails.push("fixture automatedCohortExecuted must be 1");
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
  const url = fixture.stagingWeb.replace(/\/$/, "") + scenario.path;
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
    const ok = (scenario.mustIncludeAny || []).some((n) => lower.includes(String(n).toLowerCase()));
    if (!ok) fails.push("live FAIL " + scenario.id + " missing expected markers");
  }
  console.log("[verify:rel-603-age-usability-spotcheck] live PASS " + scenario.id + " " + res.status);
}

function runPlaywright() {
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
        REL603_STAGING_WEB: fixture.stagingWeb,
      },
      shell: process.platform === "win32",
    },
  );
  if (run.status !== 0) {
    fails.push(
      "playwright FAIL: " + String(run.stderr || run.stdout || "").split("\n").slice(-5).join(" "),
    );
  } else {
    console.log("[verify:rel-603-age-usability-spotcheck] playwright PASS 9 cohorts x 4 scenarios");
  }
}

(async function main() {
  if (fails.length === 0) {
    try {
      for (const scenario of fixture.scenarios || []) {
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
      const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 180_000,
        env: { ...process.env, CI: "true" },
      });
      if (run.status !== 0) {
        fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-603-age-usability-spotcheck] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log("[verify:rel-603-age-usability-spotcheck] PASS (9 automated cohorts · staging · human 0)");
  } else {
    console.log("[verify:rel-603-age-usability-spotcheck] PASS (wiring + live + playwright · close pending)");
  }
})();
