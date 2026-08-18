/**
 * verify:platform-change-control — R0-3 Architecture Change Control
 *
 * 검증:
 * 1) governance/platform-redesign/change-control.v1.md 존재
 * 2) schema/todoId/redesignStage/구현코드0 메타
 * 3) L1/L2/L3 절차 · version bump 규칙
 * 4) ADR-017 Light+Purple · IA 새 라벨 · OpenNext Workers
 *    각 before/after/영향/rollback/승인 증거
 * 5) 외부 d903eef7 실행금지 + 흡수 crosswalk
 * 6) R0 freeze 대상 10항목
 * 7) package.json + CATALOG 배선 (ghost verify 금지)
 * 8) 본 슬라이스는 governance+verify+CATALOG/package만 (구현코드0 문서 잠금)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const docPath = path.join(
  root,
  "governance/platform-redesign/change-control.v1.md",
);

function fail(msg) {
  fails.push(msg);
}

function mustInclude(hay, needle, label) {
  if (!hay.includes(needle)) fail(`missing ${label}: ${needle}`);
}

if (!fs.existsSync(docPath)) {
  fail("missing governance/platform-redesign/change-control.v1.md");
}

let doc = "";
if (fs.existsSync(docPath)) {
  doc = fs.readFileSync(docPath, "utf8");
}

if (doc) {
  mustInclude(
    doc,
    "governance.platform-redesign.change-control.v1",
    "schema",
  );
  mustInclude(doc, "platform-redesign-r0-change-control", "todoId");
  mustInclude(doc, "redesignStage", "redesignStage field");
  mustInclude(doc, "`R0`", "redesignStage=R0");
  mustInclude(doc, "구현코드0", "구현코드0 lock");
  mustInclude(doc, "Change Control ≠ immutability", "immutability≠freeze");
  mustInclude(doc, "blocked", "blocked-when-no-approver");

  // L1/L2/L3
  for (const lv of ["L1", "L2", "L3"]) {
    mustInclude(doc, lv, `level ${lv}`);
  }
  mustInclude(doc, "domain review", "L1 domain review");
  mustInclude(doc, "owner", "L2 owner 승인");
  mustInclude(doc, "founder", "L3 founder");
  mustInclude(doc, "독립 reviewer", "L3 independent reviewer");
  mustInclude(doc, "rollback", "rollback requirement");
  mustInclude(doc, "version bump", "version bump rules");
  mustInclude(doc, "patch", "patch bump");
  mustInclude(doc, "minor", "minor bump");
  mustInclude(doc, "major", "major bump");
  mustInclude(doc, "조용한 수정 금지", "no silent edit");

  // ADR-017 Light+Purple
  mustInclude(doc, "ADR-017", "ADR-017");
  mustInclude(doc, "peotteok-light", "peotteok-light");
  mustInclude(doc, "Light+Purple", "Light+Purple");
  mustInclude(doc, "cc.adr017.peotteok-light", "ADR-017 changeId");
  for (const k of ["before", "after", "영향", "rollback", "승인 증거"]) {
    // section 6.1 must spell these; count occurrences across supersession blocks
    if (!doc.includes(k)) fail(`missing supersession field keyword: ${k}`);
  }
  mustInclude(doc, "dual toggle", "dual toggle 0");
  mustInclude(doc, "lux-dark", "lux-dark archive");

  // IA labels
  mustInclude(doc, "홈 · 기회 · 수익 · 지갑 · 내정보", "IA new labels");
  mustInclude(doc, "내거래", "deprecated 내거래");
  mustInclude(doc, "cc.ia.nav-labels-v723", "IA changeId");
  mustInclude(doc, "/profits", "href /profits preserved");
  mustInclude(doc, "/trades", "href /trades preserved");

  // OpenNext Workers
  mustInclude(doc, "OpenNext", "OpenNext");
  mustInclude(doc, "Workers only", "Workers only");
  mustInclude(doc, "cc.infra.opennext-workers-only", "OpenNext changeId");
  mustInclude(doc, "wrangler pages deploy", "pages deploy forbidden");
  mustInclude(doc, "infra/domain.manifest.json", "domain.manifest SSOT");
  mustInclude(doc, "workersDev", "workersDev origin");

  // d903eef7
  mustInclude(doc, "d903eef7", "external d903eef7");
  mustInclude(doc, "REFERENCE ONLY", "REFERENCE ONLY");
  mustInclude(doc, "실행금지", "execution forbidden");
  mustInclude(doc, "흡수 crosswalk", "absorption crosswalk");
  mustInclude(doc, "phase0-change-control", "crosswalk row phase0-change-control");
  mustInclude(
    doc,
    "platform-redesign-r0-change-control",
    "crosswalk maps to ACTIVE todo",
  );

  // freeze list keywords (10 surfaces)
  const freeze = [
    "route inventory",
    "Fact inventory",
    "API boundary",
    "state model",
    "token hierarchy",
    "asset pipeline",
    "auth boundary",
    "money invariant",
    "event schema",
    "naming convention",
  ];
  for (const f of freeze) {
    mustInclude(doc, f, `freeze surface: ${f}`);
  }

  // supersession changeIds each have level markers nearby — structural: 3 changeIds
  const changeIds = [
    "cc.adr017.peotteok-light",
    "cc.ia.nav-labels-v723",
    "cc.infra.opennext-workers-only",
  ];
  for (const id of changeIds) {
    const idx = doc.indexOf(id);
    if (idx < 0) continue;
    const window = doc.slice(idx, idx + 1200);
    for (const field of ["before", "after", "영향", "rollback", "승인 증거"]) {
      if (!window.includes(field)) {
        fail(`${id}: section missing field "${field}" within following block`);
      }
    }
  }

  // prerequisites exist
  for (const rel of [
    "governance/platform-redesign/baseline.v1.json",
    "governance/platform-redesign/route-contract-matrix.v1.json",
    "governance/platform-redesign/fact-state-registry.v1.json",
  ]) {
    if (!fs.existsSync(path.join(root, rel))) {
      fail(`prerequisite missing: ${rel}`);
    }
  }
}

// package.json + CATALOG wiring
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
if (!pkg.scripts || !pkg.scripts["verify:platform-change-control"]) {
  fail("package.json missing verify:platform-change-control");
}
const catalog = fs.readFileSync(
  path.join(root, "tooling/verify/CATALOG.md"),
  "utf8",
);
if (!catalog.includes("platform-change-control")) {
  fail("CATALOG.md missing platform-change-control");
}

// domain-by-path should trigger this verify for governance changes
const domainByPath = fs.readFileSync(
  path.join(root, "tooling/verify/domain-by-path.cjs"),
  "utf8",
);
if (!domainByPath.includes("platform-change-control.cjs")) {
  fail("domain-by-path.cjs missing platform-change-control.cjs");
}

if (fails.length) {
  console.error("[verify:platform-change-control] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  "[verify:platform-change-control] PASS (L1/L2/L3 · version bump · ADR-017 · IA · OpenNext Workers · d903eef7 crosswalk · 구현코드0)",
);
