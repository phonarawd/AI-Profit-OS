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

// Home Visual V2 authority gate — stale V1 / NOT_STARTED claims must not pass.
const homeV2WireRel = "packages/ui/canon/surfaces/home-visual-v2.wire.json";
const homeV2WirePath = path.join(root, homeV2WireRel);
if (!fs.existsSync(homeV2WirePath)) {
  fails.push(`missing ${homeV2WireRel}`);
} else {
  const hv = JSON.parse(fs.readFileSync(homeV2WirePath, "utf8"));
  const blob = JSON.stringify(hv);
  const must = [
    ["visualMasterIntakeRef", "peotteok-home-visual-master-intake.v2.md"],
    ["newVisualContractRef", "peotteok-home-visual-contract.v2.md"],
    ["newImplementationContractRef", "peotteok-home-implementation-contract.v2.md"],
    ["contractSyncRef", "peotteok-home-contract-sync.v1.md"],
    ["v2DeltaSyncRef", "peotteok-home-v2-delta-sync.v1.md"],
    ["assetProductionPartBRef", "peotteok-home-asset-production-part-b.v2.md"],
  ];
  for (const [field, needle] of must) {
    if (!String(hv[field] || "").includes(needle)) {
      fails.push(`${homeV2WireRel}: ${field} must point at ${needle}`);
    }
  }
  if (!String(hv.historicalVisualMasterIntakeRef || "").includes("peotteok-home-visual-master-intake.v1.md")) {
    fails.push(`${homeV2WireRel}: historicalVisualMasterIntakeRef must preserve V1 intake`);
  }
  if (!/H5_COMPLETE/.test(String(hv.newVisualContractStatus || ""))) {
    fails.push(`${homeV2WireRel}: H5 Visual Contract must be completed`);
  }
  if (!/H6_COMPLETE/.test(String(hv.newImplementationContractStatus || ""))) {
    fails.push(`${homeV2WireRel}: H6 Implementation Contract must be completed`);
  }
  if (!/H6\.5_COMPLETE/.test(String(hv.contractSyncStatus || ""))) {
    fails.push(`${homeV2WireRel}: H6.5 Contract Sync must be completed`);
  }
  if (!/V2_DELTA_SYNC_PASS|DELTA SYNC PASS/.test(String(hv.v2DeltaSyncStatus || ""))) {
    fails.push(`${homeV2WireRel}: V2 delta sync must be PASS`);
  }
  if (!/ASSET_PART_B_V2_COMPLETE/.test(String(hv.assetProductionPartBStatus || ""))) {
    fails.push(`${homeV2WireRel}: Asset Part B must be completed`);
  }
  if (!/H7_NOT_STARTED/.test(String(hv.assetProductionPartBStatus || blob))) {
    fails.push(`${homeV2WireRel}: H7_NOT_STARTED required`);
  }
  if (String(hv.h7ImplementationStatus || "") !== "READY_TO_START") {
    fails.push(`${homeV2WireRel}: h7ImplementationStatus must be READY_TO_START (H7 not started)`);
  }
  if (/\bH7_STARTED\b/.test(blob) && !/H7_STARTED=NO/.test(blob)) {
    fails.push(`${homeV2WireRel}: H7 must not be recorded as STARTED`);
  }
  const stale = ["VISUAL_CONTRACT_NOT_STARTED", "IMPLEMENTATION_CONTRACT_NOT_STARTED"];
  for (const phrase of stale) {
    if (blob.includes(phrase)) {
      fails.push(`${homeV2WireRel}: stale ${phrase} must be 0`);
    }
  }
}

if (fails.length) {
  console.error("[verify:canon-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(`[verify:canon-surfaces] PASS (${surfaces.length} wires · checklist fields · home-visual-v2 authority)`);
