/**
 * verify:axe-harness — REL-012
 * axe-core가 committed Playwright spec에서 실행된다. MCP-only 0. Home freeze 재설계 0.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "tooling/e2e/lib/axe-scan.cjs",
  "tooling/e2e/specs/axe-a11y.spec.cjs",
  "tooling/e2e/specs/critical-axe.spec.cjs",
  ".github/workflows/critical-axe.yml",
  "tooling/e2e/fixtures/axe-known-issues.v1.json",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

const spec = read("tooling/e2e/specs/axe-a11y.spec.cjs");
const lib = read("tooling/e2e/lib/axe-scan.cjs");
const readme = read("tooling/e2e/README.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!spec.includes("axe-scan") || !spec.includes("@playwright/test")) {
  fails.push("spec must be a Playwright harness that uses axe-scan");
}
if (!spec.includes("390") || !spec.includes("1440")) {
  fails.push("spec must scan Home 390 and 1440");
}
if (!spec.includes("/auth/login") && !spec.includes("/profits")) {
  fails.push("spec must include login or profits");
}
if (!spec.includes("AXE_BROWSER")) {
  fails.push("browser full matrix must be gated (AXE_BROWSER)");
}
const liveAxe = read("tooling/e2e/specs/critical-axe.spec.cjs");
if (liveAxe.includes("test.skip(")) {
  fails.push("critical-axe live scan must not skip and still count as PASS");
}
if (!liveAxe.includes("live axe critical")) {
  fails.push("critical-axe must run a live browser scan");
}
if (/playwright mcp|browser_navigate/i.test(spec + lib)) {
  fails.push("MCP-only evidence is not DONE");
}

if (!lib.includes("axe-core") || !lib.includes("runAxeOnHtml")) {
  fails.push("axe-scan must run axe-core in-process");
}

if (!pkg.includes('"axe-core"')) {
  fails.push("root package.json must depend on axe-core");
}
if (!pkg.includes('"verify:axe-harness"')) {
  fails.push("package.json missing verify:axe-harness");
}
if (!catalog.includes("axe-harness")) {
  fails.push("CATALOG.md must list axe-harness");
}
if (!domain.includes("axe-harness.cjs")) {
  fails.push("domain-by-path must trigger axe-harness");
}
if (readme && !/axe-core/.test(readme)) {
  fails.push("e2e README must document axe-core");
}

const known = JSON.parse(
  read("tooling/e2e/fixtures/axe-known-issues.v1.json") || "{}",
);
if (known.homeGeometryPatch !== 0) {
  fails.push("Home geometry patch must stay 0");
}
if (known.mcpOnlyEvidence !== 0) {
  fails.push("mcpOnlyEvidence must stay 0");
}

function resolveFromRoot(name) {
  try {
    return require.resolve(name, { paths: [root] });
  } catch {
    return "";
  }
}

if (!resolveFromRoot("axe-core/package.json")) {
  fails.push("axe-core is not resolvable");
}

if (fails.length === 0) {
  const {
    runAxeOnHtml,
    blockingViolations,
    AXE_SCAN_TARGETS,
    INTENTIONAL_FAIL_HTML,
    CLEAN_PROBE_HTML,
  } = require(path.join(root, "tooling/e2e/lib/axe-scan.cjs"));

  const homes = AXE_SCAN_TARGETS.filter((t) => t.route === "/");
  if (!homes.some((t) => t.width === 390) || !homes.some((t) => t.width === 1440)) {
    fails.push("AXE_SCAN_TARGETS missing Home 390/1440");
  }
  if (
    !AXE_SCAN_TARGETS.some(
      (t) => t.route === "/auth/login" || t.route === "/profits",
    )
  ) {
    fails.push("AXE_SCAN_TARGETS missing login or profits");
  }

  Promise.resolve()
    .then(async () => {
      const bad = await runAxeOnHtml(INTENTIONAL_FAIL_HTML);
      if (blockingViolations(bad).length === 0) {
        fails.push("intentional unlabeled control did not fail axe (no-op residual)");
      }
      const clean = await runAxeOnHtml(CLEAN_PROBE_HTML);
      if (!Array.isArray(clean.violations)) {
        fails.push("axe did not return a violations array on the clean probe");
      }
    })
    .then(() => {
      if (fails.length) {
        console.error("[verify:axe-harness] FAIL\n- " + fails.join("\n- "));
        process.exit(1);
      }
      console.log(
        "[verify:axe-harness] PASS (axe-core runs in committed spec · Home 390/1440+login · MCP 0 · freeze 0)",
      );
    })
    .catch((err) => {
      console.error("[verify:axe-harness] FAIL\n- axe run error: " + err.message);
      process.exit(1);
    });
} else {
  console.error("[verify:axe-harness] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
