/**
 * verify:responsive — Playwright multi-viewport harness (audit §45)
 * Diffs Canon structure (blocks[].id / data-canon-block), never raw pixels (ADR-013).
 * Local default = Node structure gate. Playwright browsers = RESPONSIVE_PW=1.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

const {
  HARNESS_VIEWPORTS,
  loadViewportsJson,
  loadHarnessManifest,
  listHarnessSurfaces,
  expectedStructure,
  fixtureHtml,
  extractBlocksFromHtml,
  assertViewportsLocked,
  findPixelApis,
  allTestPointsFlat,
} = require("../../packages/ui/responsive/visual-regression/canon-structure.cjs");

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

// --- harness files ---
const harnessFiles = [
  "packages/ui/responsive/visual-regression/viewports.json",
  "packages/ui/responsive/visual-regression/harness.manifest.json",
  "packages/ui/responsive/visual-regression/canon-structure.cjs",
  "packages/ui/responsive/visual-regression/README.md",
  "packages/ui/tokens/breakpoints.ts",
  "tooling/verify/responsive/playwright.config.cjs",
  "tooling/verify/responsive/tests/canon-structure.spec.cjs",
  "tooling/verify/responsive/run-playwright.cjs",
];
for (const f of harnessFiles) mustExist(f);

// --- viewport matrix lock ---
let vpJson;
try {
  vpJson = loadViewportsJson(root);
} catch (e) {
  fails.push(`viewports.json unreadable: ${e.message}`);
}
if (vpJson) {
  assertViewportsLocked(vpJson.widthsPx, fails, "viewports.json.widthsPx");
  if (vpJson.mode !== "canon_structure") {
    fails.push("viewports.json.mode must be canon_structure");
  }
  if (vpJson.contentRailMaxPx !== 1440) {
    fails.push("viewports.json.contentRailMaxPx must be 1440");
  }
}

const bpSrc = read("packages/ui/tokens/breakpoints.ts");
if (bpSrc) {
  if (!bpSrc.includes("RESPONSIVE_HARNESS_VIEWPORTS")) {
    fails.push("breakpoints.ts must export RESPONSIVE_HARNESS_VIEWPORTS");
  }
  for (const w of HARNESS_VIEWPORTS) {
    if (!bpSrc.includes(String(w))) {
      fails.push(`breakpoints.ts missing harness width ${w}`);
    }
  }
  // Harness widths must be covered by VIEWPORT_TEST_POINTS
  const flat = allTestPointsFlat();
  for (const w of HARNESS_VIEWPORTS) {
    if (!flat.includes(w)) {
      fails.push(`harness width ${w} missing from VIEWPORT_TEST_POINTS`);
    }
  }
}

let man;
try {
  man = loadHarnessManifest(root);
} catch (e) {
  fails.push(`harness.manifest.json unreadable: ${e.message}`);
}
if (man) {
  if (man.diffMode !== "canon_structure") {
    fails.push("harness.manifest.diffMode must be canon_structure");
  }
  for (const bad of [
    "raw_pixel_screenshot",
    "toHaveScreenshot",
    "photo_pixel_match",
  ]) {
    if (!(man.forbiddenDiffModes || []).includes(bad)) {
      fails.push(`harness.manifest.forbiddenDiffModes missing ${bad}`);
    }
  }
  if (man.selectors?.blockAttr !== "data-canon-block") {
    fails.push("harness.manifest.selectors.blockAttr must be data-canon-block");
  }
}

// --- Playwright config encodes all viewports · no pixel APIs ---
const pwConfig = read("tooling/verify/responsive/playwright.config.cjs");
if (pwConfig) {
  if (!pwConfig.includes("HARNESS_VIEWPORTS")) {
    fails.push("playwright.config must use HARNESS_VIEWPORTS");
  }
  if (!pwConfig.includes('screenshot: "off"')) {
    fails.push('playwright.config must set screenshot: "off"');
  }
  const pixelHits = findPixelApis(pwConfig);
  if (pixelHits.length) {
    fails.push(
      "playwright.config forbids pixel APIs:\n  " + pixelHits.join("\n  "),
    );
  }
}

const pwSpec = read("tooling/verify/responsive/tests/canon-structure.spec.cjs");
if (pwSpec) {
  const pixelHits = findPixelApis(pwSpec);
  if (pixelHits.length) {
    fails.push(
      "canon-structure.spec forbids pixel APIs:\n  " + pixelHits.join("\n  "),
    );
  }
  if (!pwSpec.includes("data-canon-block") && !pwSpec.includes("BLOCK_ATTR")) {
    fails.push("canon-structure.spec must assert data-canon-block order");
  }
  if (!pwSpec.includes("toEqual(surface.blocks)")) {
    fails.push("canon-structure.spec must compare DOM order to wire.blocks");
  }
}

// --- Canon structure: fixture DOM order === wire.blocks ---
let surfaces = [];
try {
  surfaces = listHarnessSurfaces(root);
} catch (e) {
  fails.push(`listHarnessSurfaces: ${e.message}`);
}
if (surfaces.length < 5) {
  fails.push(`expected ≥5 harness surfaces, got ${surfaces.length}`);
}

for (const s of surfaces) {
  const expected = expectedStructure(s);
  if (expected.blocks.length === 0) {
    fails.push(`${s.id}: empty blocks`);
    continue;
  }
  const html = fixtureHtml(s);
  const got = extractBlocksFromHtml(html);
  if (JSON.stringify(got) !== JSON.stringify(expected.blocks)) {
    fails.push(
      `${s.id}: fixture block order ${JSON.stringify(got)} ≠ wire ${JSON.stringify(expected.blocks)}`,
    );
  }
  if (!(s.forbidden || []).includes("photo_pixel_match")) {
    fails.push(`${s.id}: wire.forbidden must include photo_pixel_match`);
  }
}

// --- PART8c: fluid · touch-target · device-tier · Virtual ---
const part8cFiles = [
  "packages/ui/responsive/fluid-type.css",
  "packages/ui/responsive/touch-target.css",
  "packages/ui/responsive/container.css",
  "packages/sdk/src/device-tier.ts",
  "packages/ui/components/lux/VirtualList.tsx",
  "packages/ui/components/lux/VirtualTicker.tsx",
  "packages/ui/components/lux/FluidCard.tsx",
  "packages/ui/components/lux/TouchButton.tsx",
  "packages/ui/components/opportunity/VirtualOpportunityList.tsx",
  "apps/web/components/DeviceTierApply.tsx",
];
for (const f of part8cFiles) mustExist(f);

const fluid = read("packages/ui/responsive/fluid-type.css");
if (fluid && !fluid.includes("clamp(")) {
  fails.push("fluid-type.css must use clamp() tokens");
}
if (fluid && !fluid.includes("--text-body")) {
  fails.push("fluid-type.css must define --text-body");
}

const touch = read("packages/ui/responsive/touch-target.css");
if (touch && !touch.includes("min-height: var(--touch-min")) {
  fails.push("touch-target.css must enforce --touch-min (48px)");
}
if (touch && !touch.includes("flex-shrink: 0")) {
  fails.push("touch-target.css must set flex-shrink: 0 on controls");
}

const tierSrc = read("packages/sdk/src/device-tier.ts");
if (tierSrc && !tierSrc.includes('export type DeviceTier = "S" | "A" | "B"')) {
  fails.push('device-tier must export DeviceTier "S"|"A"|"B"');
}
if (tierSrc && !tierSrc.includes("tierBatchMs")) {
  fails.push("device-tier must export tierBatchMs");
}

const virtList = read("packages/ui/components/lux/VirtualList.tsx");
if (virtList && !virtList.includes("@tanstack/react-virtual")) {
  fails.push("VirtualList must use @tanstack/react-virtual");
}
if (virtList && !virtList.includes("overscan")) {
  fails.push("VirtualList must expose overscan (default 3)");
}

const virtOpp = read("packages/ui/components/opportunity/VirtualOpportunityList.tsx");
if (virtOpp && !virtOpp.includes("VIRTUAL_OPPORTUNITY_THRESHOLD")) {
  fails.push("VirtualOpportunityList must define VIRTUAL_OPPORTUNITY_THRESHOLD");
}
if (virtOpp && !/=\s*20\b/.test(virtOpp) && !virtOpp.includes("20")) {
  fails.push("VirtualOpportunityList threshold must be 20");
}

const virtTicker = read("packages/ui/components/lux/VirtualTicker.tsx");
if (virtTicker && !virtTicker.includes("VIRTUAL_TICKER_THRESHOLD")) {
  fails.push("VirtualTicker must define VIRTUAL_TICKER_THRESHOLD");
}

const layout = read("apps/web/app/layout.tsx");
if (layout && !layout.includes("DeviceTierApply")) {
  fails.push("apps/web layout must mount DeviceTierApply (data-tier)");
}
if (layout && !layout.includes("lux-app-main")) {
  fails.push("apps/web layout must use lux-app-main content rail");
}

const profits = read("apps/web/app/profits/page.tsx");
if (profits && !profits.includes("VirtualOpportunityList")) {
  fails.push("/profits must use VirtualOpportunityList");
}

const uiPkg = read("packages/ui/package.json");
if (uiPkg && !uiPkg.includes("@tanstack/react-virtual")) {
  fails.push("packages/ui must depend on @tanstack/react-virtual");
}

const liveTicker = read("packages/ui/components/lux/LivePayoutTicker.tsx");
if (liveTicker && !liveTicker.includes("VirtualTicker")) {
  fails.push("LivePayoutTicker must mount VirtualTicker");
}

// package.json script + catalog pointer
const pkg = read("package.json");
if (pkg && !pkg.includes('"verify:responsive"')) {
  fails.push('package.json missing "verify:responsive" script');
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("| responsive |")) {
  fails.push("CATALOG.md must document | responsive | gate");
}

if (fails.length) {
  console.error("[verify:responsive] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

// Optional Playwright (CI / RESPONSIVE_PW=1)
const pw = spawnSync(
  process.execPath,
  [path.join(__dirname, "responsive/run-playwright.cjs")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(pw.stdout || "");
process.stderr.write(pw.stderr || "");
if (pw.status !== 0) {
  console.error("[verify:responsive] FAIL at Playwright runner");
  process.exit(pw.status || 1);
}

console.log(
  `[verify:responsive] PASS (Canon structure · ${HARNESS_VIEWPORTS.length} viewports · ${surfaces.length} surfaces · no pixel diff)`,
);
