/**
 * verify:canon-surfaces — every manifest surface has wire + required fields
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const manPath = path.join(root, "packages/ui/canon/manifest.json");
if (!fs.existsSync(manPath)) {
  console.error("[verify:canon-surfaces] FAIL missing manifest");
  process.exit(1);
}

const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
const surfaces = man.surfaces || [];
if (surfaces.length < 10) fails.push(`expected ≥10 surfaces, got ${surfaces.length}`);

for (const s of surfaces) {
  if (!s.id || !s.wire) {
    fails.push(`surface missing id/wire: ${JSON.stringify(s)}`);
    continue;
  }
  const wirePath = path.join(root, "packages/ui/canon", s.wire);
  if (!fs.existsSync(wirePath)) {
    fails.push(`missing wire ${s.wire}`);
    continue;
  }
  let w;
  try {
    w = JSON.parse(fs.readFileSync(wirePath, "utf8"));
  } catch {
    fails.push(`invalid JSON ${s.wire}`);
    continue;
  }
  if (w.id !== s.id) fails.push(`${s.wire}: id mismatch (${w.id} ≠ ${s.id})`);
  if (!w.route) fails.push(`${s.wire}: missing route`);
  if (!Array.isArray(w.blocks) || w.blocks.length === 0) {
    fails.push(`${s.wire}: blocks[] required`);
  }
  if (!w.brandRef) fails.push(`${s.wire}: brandRef required`);
  if (!Array.isArray(w.forbidden)) fails.push(`${s.wire}: forbidden[] required`);
  if (w.forbidden && !w.forbidden.includes("photo_pixel_match")) {
    // soft: many wires already have it; warn as fail for user-facing
    if (!String(s.id).startsWith("admin-")) {
      fails.push(`${s.wire}: forbidden must include photo_pixel_match`);
    }
  }
}

if (fails.length) {
  console.error("[verify:canon-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(`[verify:canon-surfaces] PASS (${surfaces.length} wires · checklist fields)`);
