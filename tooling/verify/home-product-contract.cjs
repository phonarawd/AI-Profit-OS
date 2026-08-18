/**
 * verify:home-product-contract — Redesign R1 H4
 * (`redesign-r1-home-product-contract` · `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md`)
 *
 * H4는 Functional Truth Contract다(디자인 구현 아님). 이 스크립트는:
 *  - 계약 문서가 존재하고 필수 15섹션을 모두 포함하는지
 *  - 5-분류 taxonomy(MATCH/FUNCTIONAL_BINDING_REQUIRED/VISUAL_ONLY_EXAMPLE/
 *    NOT_SUPPORTED/FUNCTIONAL_BINDING_UNRESOLVED)가 실제로 사용됐는지
 *  - governance 경계 마커(runtime 0 · fake binding 0 · H5/H6/H7 미착수)가 명시됐는지
 *  - Visual Master 예시 리터럴이 "예시로만" 언급되고 실제 runtime 코드(packages/ui,
 *    apps/web)에 하드코딩되지 않았는지
 *  - 관련 Canon wire(home-visual-v2/home-principal-slots)를 참조하는지
 * 를 확인한다. Visual Master의 geometry/색/spacing 값을 검증하지 않는다(H5 범위).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const contractPath = path.join(
  root,
  "packages/ui/canon/contracts/peotteok-home-product-contract.v1.md",
);
if (!fs.existsSync(contractPath)) {
  console.error(
    "[verify:home-product-contract] FAIL missing packages/ui/canon/contracts/peotteok-home-product-contract.v1.md",
  );
  process.exit(1);
}
const doc = fs.readFileSync(contractPath, "utf8");

// --- required sections (H4 output format §1-15) ---
const REQUIRED_SECTIONS = [
  "Home Route / State Truth",
  "Data Source Matrix",
  "Money Semantics Matrix",
  "KRW / USDT Binding Rules",
  "Actual vs Estimated Profit Contract",
  "Opportunity Binding Contract",
  "Processing-Time Contract",
  "AI Summary Functional Contract",
  "CTA / Action Ownership",
  "Loading / Empty / Error States",
  "Update Schedule Slot",
  "Functional Conflicts / Resolutions",
  "H5(Visual Contract)에 넘길 visual-only 영역",
  "H6(Implementation Contract)에 넘길 concerns",
  "Unresolved Blocker Count",
];
for (const s of REQUIRED_SECTIONS) {
  if (!doc.includes(s)) fails.push(`missing required section: ${s}`);
}

// --- classification taxonomy must actually be used ---
const TAXONOMY = [
  "MATCH",
  "FUNCTIONAL_BINDING_REQUIRED",
  "VISUAL_ONLY_EXAMPLE",
  "NOT_SUPPORTED",
  "FUNCTIONAL_BINDING_UNRESOLVED",
];
for (const t of TAXONOMY) {
  if (!doc.includes(t)) fails.push(`classification taxonomy token unused: ${t}`);
}

// --- governance boundary markers ---
const MARKERS = [
  "Runtime code changed by this document",
  "New backend feature invented",
  "H5/H6/H7 started by this document",
  "Fake binding count",
];
for (const m of MARKERS) {
  if (!doc.includes(m)) fails.push(`missing governance boundary marker: ${m}`);
}
if (!/Runtime code changed by this document\s*\|\s*\*\*0\*\*/.test(doc)) {
  fails.push("Runtime code changed by this document must be declared 0");
}
if (!/Fake binding count\s*\|\s*0/.test(doc)) {
  fails.push("Fake binding count must be declared 0");
}
if (!/H5\/H6\/H7 started by this document\s*\|\s*NO/.test(doc)) {
  fails.push("H5/H6/H7 started by this document must be declared NO");
}

// --- Canon wire cross-reference (functional authority must point at real wires) ---
for (const wireRef of ["home-visual-v2.wire.json", "home-principal-slots.wire.json"]) {
  if (!doc.includes(wireRef)) fails.push(`missing Canon wire cross-reference: ${wireRef}`);
}

// --- Visual Master example literals must be framed as VISUAL_ONLY_EXAMPLE, never
//     as runtime hardcode in apps/web or packages/ui source (outside this contract doc).
const EXAMPLE_LITERALS = [
  "1,720,000",
  "128,000",
  "32,000",
];
const runtimeScanDirs = [
  path.join(root, "apps/web"),
  path.join(root, "packages/ui"),
];
function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, fn);
    else if (/\.(ts|tsx|cjs|mjs|json)$/.test(ent.name)) fn(p);
  }
}
for (const scanDir of runtimeScanDirs) {
  walk(scanDir, (file) => {
    const src = fs.readFileSync(file, "utf8");
    for (const lit of EXAMPLE_LITERALS) {
      if (src.includes(lit)) {
        fails.push(
          `Visual Master example literal "${lit}" hardcoded in runtime file: ${path.relative(root, file)}`,
        );
      }
    }
  });
}

// --- H1 intake doc must exist and this document must reference it (input chain intact) ---
const h1Path = path.join(
  root,
  "packages/ui/canon/contracts/peotteok-home-visual-master-intake.v1.md",
);
if (!fs.existsSync(h1Path)) {
  fails.push("H1 intake doc missing (input chain broken): peotteok-home-visual-master-intake.v1.md");
} else if (!doc.includes("peotteok-home-visual-master-intake.v1.md")) {
  fails.push("H4 doc must reference H1 intake doc as input");
}

if (fails.length) {
  console.error("[verify:home-product-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:home-product-contract] PASS (15 sections · 5-taxonomy used · governance markers 0/0/NO · Canon wire refs · example literals not hardcoded in runtime)",
);
