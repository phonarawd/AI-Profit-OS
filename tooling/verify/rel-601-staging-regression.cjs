/**
 * verify:rel-601-staging-regression
 * Surface Matrix live hit on preview workers only. Home redesign 0.
 * Local full Playwright/Lighthouse matrix is NOT_RUN, not faked PASS.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const LIVE_FETCH_ATTEMPTS = 3;
const LIVE_FETCH_TIMEOUT_MS = 12000;
const LIVE_FETCH_RETRY_DELAY_MS = 750;

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

const fixture = readJson("tooling/verify/fixtures/rel-601-staging-regression.v1.json");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const evidence = read("governance/release-master/REL-601-STAGING-REGRESSION.md");
const matrixMd = read("governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.md");
const matrixJson = read("governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.json");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const readme = read("tooling/e2e/README.md");
const homeSpec = read("tooling/e2e/specs/home-closure.spec.cjs");
const homeLock = readJson("governance/responsive/home-geometry-lock.v1.json");
const largeScreen = readJson("governance/responsive/large-screen-safety.v1.json");
const manifest = readJson("infra/domain.manifest.json");

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function yamlCompleted(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return false;
  return /STATUS:\s*COMPLETED/.test(plan.slice(idx, idx + 240));
}

if (fixture.productionDomainMutation !== 0) fails.push("fixture productionDomainMutation must be 0");
if (fixture.productionWorkflowDispatch !== 0) fails.push("fixture productionWorkflowDispatch must be 0");
if (fixture.pagesDeploy !== 0) fails.push("fixture pagesDeploy must be 0");
if (fixture.vercel !== 0) fails.push("fixture vercel must be 0");
if (fixture.homeVisualRedesign !== 0) fails.push("fixture homeVisualRedesign must be 0");
if (fixture.localFullMatrix !== 0) fails.push("fixture localFullMatrix must stay 0");
if (fixture.localFullLighthouse !== 0) fails.push("fixture localFullLighthouse must stay 0");
if (fixture.localBrowserVsLiveStaging !== 0) fails.push("fixture must not claim live staging Playwright");
if (fixture.moneyMutationVsLiveStaging !== 0) fails.push("fixture must not mutate money on live staging");
if (fixture.mcpOnlyDone !== 0) fails.push("MCP-only is not DONE");

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

const staging = manifest.openNext && manifest.openNext.staging;
if (!staging || staging.wranglerEnv !== "preview") {
  fails.push("manifest staging wranglerEnv must be preview");
}
if (!fixture.stagingWeb || !fixture.stagingWeb.includes("ai-profit-web-preview")) {
  fails.push("fixture staging web must be preview workers");
}
if (!fixture.stagingOps || !fixture.stagingOps.includes("ai-profit-ops-preview")) {
  fails.push("fixture staging ops must be preview workers");
}
if (staging.web.workersDev !== "ai-profit-web-preview.ebay-adapter.workers.dev") {
  fails.push("staging web origin drift");
}
if (staging.ops.workersDev !== "ai-profit-ops-preview.ebay-adapter.workers.dev") {
  fails.push("staging ops origin drift");
}

for (const host of fixture.forbiddenLiveHosts || []) {
  const body = JSON.stringify(fixture.probes || []);
  if (body.includes(host)) fails.push("probe list must not target production host " + host);
}

if (!matrixMd.includes("| SURFACE | ROUTE | REL |")) {
  fails.push("Surface Matrix markdown missing header");
}
for (const needle of ["| Home |", "/profits", "/wallet", "/me", "/admin"]) {
  if (!matrixMd.includes(needle)) fails.push("Surface Matrix missing " + needle);
}
if (!matrixJson.includes("putduk.ui.visual-matrix.v1")) {
  fails.push("Surface Matrix JSON schema missing");
}

if (homeLock.rewrite !== "FORBIDDEN") fails.push("home-geometry-lock rewrite must stay FORBIDDEN");
if (!Array.isArray(largeScreen.homeQaRels) || !largeScreen.homeQaRels.includes("REL-601")) {
  fails.push("large-screen-safety must keep REL-601 as QA owner");
}
for (const token of ["390", "1440", "2560", "3440", "3840"]) {
  if (!homeSpec.includes(token)) fails.push("home-closure spec must keep viewport " + token);
}

if (!pkg.includes("verify:rel-601-staging-regression")) {
  fails.push("package.json missing verify:rel-601-staging-regression");
}
if (!catalog.includes("rel-601-staging-regression")) {
  fails.push("CATALOG missing rel-601-staging-regression");
}
if (!gate.includes("verify:rel-601-staging-regression")) {
  fails.push("gate.yml must run verify:rel-601-staging-regression");
}
if (!domain.includes("rel-601-staging-regression.cjs")) {
  fails.push("domain-by-path must trigger rel-601");
}
if (!readme.includes("REL-601") || !readme.includes("Surface Matrix")) {
  fails.push("e2e README must document REL-601 Surface Matrix reuse");
}
if (!fixture.skippedExtraVerifies || !fixture.skippedExtraVerifies["device-tier-system.cjs"]) {
  fails.push("fixture must record why device-tier is not a hard extra");
}
if (!fixture.skippedExtraVerifies || !fixture.skippedExtraVerifies["asset-production-pipeline.cjs"]) {
  fails.push("fixture must record why asset-pipeline is not a hard extra");
}

const closed = yamlCompleted("REL-601") || todoCompleted("REL-601");
if (closed) {
  for (const needle of [
    "STATUS = COMPLETED",
    "HOME_RETROACTIVE_VISUAL_REDESIGN = NO",
    "HOME_GEOMETRY_DIFF = 0",
    "LOCAL_FULL_MATRIX = 0",
    "LOCAL_FULL_LIGHTHOUSE = 0",
    "LOCAL_BROWSER_VS_LIVE_STAGING = NOT_RUN",
    "MONEY_MUTATION_VS_LIVE_STAGING = NOT_RUN",
    "PRODUCTION_DOMAIN_UNCHANGED = 1",
    "https://ai-profit-web-preview.ebay-adapter.workers.dev",
    "https://ai-profit-ops-preview.ebay-adapter.workers.dev",
    "PUTDUK_UI_VISUAL_MATRIX.md",
    "HOME_LOCK_CRLF_ARTIFACT = 1",
    "DEVICE_TIER_RERUN = SKIP",
    "ASSET_PIPELINE_RERUN = SKIP",
    "REL-500_RERUN = SKIP",
  ]) {
    if (!evidence.includes(needle)) fails.push("evidence missing " + needle);
  }
  if (!todoCompleted("REL-601")) fails.push("rel-601 todo must be completed");
  if (!yamlCompleted("REL-601")) fails.push("REL-601 YAML must be COMPLETED");
  if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) {
    fails.push("evidence leaked a Cloudflare token");
  }
  if (evidence.includes("workflow_dispatch") && /target\s*=\s*production/.test(evidence)) {
    fails.push("evidence must not dispatch production");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTransientSafe(url, options) {
  let lastError;
  for (let attempt = 1; attempt <= LIVE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(LIVE_FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      lastError = e;
      if (attempt === LIVE_FETCH_ATTEMPTS) break;
      console.warn(
        `[verify:rel-601-staging-regression] transient fetch retry ${attempt}/${LIVE_FETCH_ATTEMPTS - 1} ${url}`,
      );
      await sleep(LIVE_FETCH_RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError || new Error("live fetch failed after bounded retries");
}

function originOf(probe) {
  return probe.origin === "ops" ? fixture.stagingOps : fixture.stagingWeb;
}

function statusOk(probe, status) {
  if (Array.isArray(probe.expectStatus) && probe.expectStatus.length) {
    return probe.expectStatus.includes(status);
  }
  if (status >= 200 && status < 400) return true;
  if (status === 401 || status === 403) return true;
  if (probe.class === "dynamic" && status === 404) return true;
  return false;
}

async function live(probe) {
  const url = originOf(probe) + probe.path;
  const res = await fetchTransientSafe(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-601-verify/1" },
  });
  const xo = res.headers.get("x-opennext");
  const loc = res.headers.get("location") || "";
  if (!statusOk(probe, res.status)) {
    fails.push("live FAIL " + probe.id + " " + url + " status=" + res.status);
    return { probe, status: res.status, xOpenNext: xo, location: loc };
  }
  if ((res.status >= 200 && res.status < 400) && xo !== "1") {
    fails.push("live FAIL " + probe.id + " missing x-opennext=1");
  }
  if (probe.expectLocation && loc !== probe.expectLocation) {
    fails.push("live FAIL " + probe.id + " location=" + loc + " expected=" + probe.expectLocation);
  }
  console.log(
    "[verify:rel-601-staging-regression] live PASS " +
      probe.id +
      " " +
      res.status +
      (loc ? " -> " + loc : ""),
  );
  return { probe, status: res.status, xOpenNext: xo, location: loc, res };
}

async function homeAssetAndBrand() {
  const url = fixture.stagingWeb + "/";
  const res = await fetchTransientSafe(url, {
    headers: { "user-agent": "ai-profit-os-rel-601-verify/1" },
  });
  const html = await res.text();
  if (res.status !== 200) {
    fails.push("Home HTML status " + res.status);
    return;
  }
  if (!html.includes("<title>퍼뜩</title>")) {
    fails.push("staging Home title must stay 퍼뜩");
  }
  if (!html.includes("theme-peotteok-light")) {
    fails.push("staging Home must keep peotteok-light theme");
  }
  for (const bad of ["vercel", "jackpot", "2450"]) {
    if (html.toLowerCase().includes(bad)) fails.push("Home HTML contains forbidden token " + bad);
  }
  const css = html.match(/href="(\/_next\/static\/[^"]+\.css)"/);
  if (!css) {
    fails.push("Home HTML missing Next static CSS href");
    return;
  }
  const asset = await fetchTransientSafe(fixture.stagingWeb + css[1], {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-601-verify/1" },
  });
  if (asset.status !== 200) {
    fails.push("Home CSS asset status " + asset.status + " " + css[1]);
  } else {
    console.log("[verify:rel-601-staging-regression] asset PASS " + css[1] + " 200");
  }
}

(async function main() {
  if (fails.length === 0) {
    try {
      for (const probe of fixture.probes || []) {
        await live(probe);
      }
      await homeAssetAndBrand();
    } catch (e) {
      fails.push("live fetch error after bounded retries: " + (e.message || e));
    }
  }

  if (fails.length === 0 && fixture.homeClosureStatic) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", fixture.homeClosureStatic)], {
      cwd: root,
      encoding: "utf8",
      timeout: 90_000,
      env: { ...process.env, CI: "true", HOME_CLOSURE_STATIC_ONLY: "1" },
    });
    if (run.status !== 0) {
      fails.push(
        "re-run FAIL " +
          fixture.homeClosureStatic +
          ": " +
          String(run.stderr || run.stdout || "").split("\n")[0],
      );
    }
  }

  if (fails.length === 0) {
    for (const script of fixture.extraVerifies || []) {
      const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 120_000,
      });
      if (run.status !== 0) {
        fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-601-staging-regression] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log("[verify:rel-601-staging-regression] PASS (Surface Matrix live · Home redesign 0)");
  } else {
    console.log("[verify:rel-601-staging-regression] PASS (live probes · close pending)");
  }
})();
