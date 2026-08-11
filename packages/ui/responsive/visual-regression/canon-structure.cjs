/**
 * Canon structure snapshot helpers for verify:responsive (audit §45).
 * Diffs wire block order + fixture DOM markers — never raw pixels (ADR-013).
 */
const fs = require("fs");
const path = require("path");

const HARNESS_VIEWPORTS = [
  390, 430, 768, 1024, 1366, 1440, 1920, 2560, 3440, 3840,
];

const BLOCK_ATTR = "data-canon-block";
const SURFACE_ATTR = "data-canon";
const LEGACY_BLOCK_ATTRS = ["data-landing-block"];

const PIXEL_API_RE =
  /\b(toHaveScreenshot|toMatchSnapshot\s*\(|pixelmatch|compareScreenshots|page\.screenshot\s*\()/;

function repoRoot() {
  // packages/ui/responsive/visual-regression → repo root (4 up)
  return path.resolve(__dirname, "../../../..");
}

function loadViewportsJson(root = repoRoot()) {
  const p = path.join(
    root,
    "packages/ui/responsive/visual-regression/viewports.json",
  );
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadHarnessManifest(root = repoRoot()) {
  const p = path.join(
    root,
    "packages/ui/responsive/visual-regression/harness.manifest.json",
  );
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadCanonManifest(root = repoRoot()) {
  const p = path.join(root, "packages/ui/canon/manifest.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/**
 * Visual Master → Visual Contract → LOCK registry (visual-master-intake.mdc).
 * Missing file = empty registry = ADR-013 default (all surfaces pixel-forbidden).
 */
function loadVisualLocks(root = repoRoot()) {
  const p = path.join(root, "packages/ui/canon/visual-locks.v1.json");
  if (!fs.existsSync(p)) return { locks: [] };
  const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!Array.isArray(parsed.locks)) return { ...parsed, locks: [] };
  return parsed;
}

/** surfaceId → true only if status=locked AND visualContractPath exists on disk. */
function lockedSurfaceIds(root = repoRoot()) {
  const { locks } = loadVisualLocks(root);
  const ids = new Set();
  for (const lock of locks || []) {
    if (!lock || lock.status !== "locked" || !lock.surfaceId) continue;
    const contractPath = lock.visualContractPath
      ? path.join(root, lock.visualContractPath)
      : null;
    if (contractPath && fs.existsSync(contractPath)) ids.add(lock.surfaceId);
  }
  return ids;
}

function loadWire(root, wireRel) {
  const p = path.join(root, "packages/ui/canon", wireRel);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** User-app surfaces only (Admin owns separate Ops theme). */
function listHarnessSurfaces(root = repoRoot()) {
  const man = loadCanonManifest(root);
  const out = [];
  for (const s of man.surfaces || []) {
    if (!s.id || !s.wire) continue;
    if (String(s.id).startsWith("admin-")) continue;
    const wire = loadWire(root, s.wire);
    if (wire.appsWebImplement === false) continue;
    if (!Array.isArray(wire.blocks) || wire.blocks.length === 0) continue;
    out.push({
      id: wire.id || s.id,
      route: wire.route || s.route,
      wireRel: s.wire,
      blocks: wire.blocks.map((b) => b.id).filter(Boolean),
      forbidden: wire.forbidden || [],
    });
  }
  return out;
}

function expectedStructure(surface) {
  return {
    id: surface.id,
    route: surface.route,
    blocks: surface.blocks.slice(),
    diffMode: "canon_structure",
  };
}

/** Deterministic fixture HTML for Playwright / Node structure parse. */
function fixtureHtml(surface) {
  const blocks = surface.blocks
    .map(
      (id) =>
        `  <section ${BLOCK_ATTR}="${id}" role="group">${id}</section>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>canon-structure:${surface.id}</title>
  <style>
    html, body { margin: 0; background: #090a10; color: #f4f6fb; font-family: sans-serif; }
    .lux-app-main {
      width: 100%;
      max-width: 1680px;
      margin-inline: auto;
      box-sizing: border-box;
      padding: 16px;
    }
    [${BLOCK_ATTR}] { min-height: 32px; padding: 8px 0; }
  </style>
</head>
<body>
<main class="lux-app-main" ${SURFACE_ATTR}="${surface.id}" data-testid="canon-fixture">
${blocks}
</main>
</body>
</html>
`;
}

function extractBlocksFromHtml(html) {
  const attrs = [BLOCK_ATTR, ...LEGACY_BLOCK_ATTRS];
  const re = new RegExp(
    `(?:${attrs.join("|")})\\s*=\\s*["']([^"']+)["']`,
    "gi",
  );
  const order = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    order.push(m[1]);
  }
  return order;
}

function assertViewportsLocked(actual, fails, label) {
  const want = HARNESS_VIEWPORTS.join(",");
  const got = (actual || []).join(",");
  if (got !== want) {
    fails.push(`${label}: expected [${want}], got [${got}]`);
  }
}

function findPixelApis(source) {
  const hits = [];
  const lines = String(source).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (PIXEL_API_RE.test(lines[i])) {
      hits.push(`L${i + 1}: ${lines[i].trim()}`);
    }
  }
  return hits;
}

function allTestPointsFlat() {
  return [
    320, 360, 375, 390, 393, 412, 430, 480, 600, 768, 820, 834, 1024, 1280,
    1366, 1440, 1536, 1600, 1920, 2560, 3440, 3840,
  ];
}

module.exports = {
  HARNESS_VIEWPORTS,
  BLOCK_ATTR,
  SURFACE_ATTR,
  LEGACY_BLOCK_ATTRS,
  PIXEL_API_RE,
  repoRoot,
  loadViewportsJson,
  loadHarnessManifest,
  loadCanonManifest,
  loadVisualLocks,
  lockedSurfaceIds,
  listHarnessSurfaces,
  expectedStructure,
  fixtureHtml,
  extractBlocksFromHtml,
  assertViewportsLocked,
  findPixelApis,
  allTestPointsFlat,
};
