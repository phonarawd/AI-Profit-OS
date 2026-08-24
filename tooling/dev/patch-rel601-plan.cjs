const fs = require("fs");
const planPath = ".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md";
let plan = fs.readFileSync(planPath, "utf8");

plan = plan.replace(
  "FIRST_EXECUTION_TODO=REL-601",
  "FIRST_EXECUTION_TODO=REL-603",
);
plan = plan.replace(
  "LAST_COMPLETED_TODO = REL-602",
  "LAST_COMPLETED_TODO = REL-601",
);
plan = plan.replace(
  /- id: rel-601\r?\n    content:.*\r?\n    status: pending/,
  "- id: rel-601\n    content: \"[Staging] Staging 전체 회귀(Surface Matrix 전량 재검증, 반응형/에셋 QA 포함)\"\n    status: completed",
);

const yamlBlock = plan.indexOf("### REL-601");
if (yamlBlock >= 0) {
  plan = plan.replace(/ID: REL-601[\s\S]*?STATUS: PENDING/, (m) =>
    m.replace("STATUS: PENDING", "STATUS: COMPLETED"),
  );
}

const overviewNeedle = "REL-602 COMPLETED.";
if (!overviewNeedle.includes("REL-601 COMPLETED")) {
  plan = plan.replace(
    overviewNeedle,
    "REL-601 COMPLETED. " + overviewNeedle,
  );
}

const footer = plan.lastIndexOf("FIRST_EXECUTION_TODO = REL-601");
if (footer >= 0) {
  plan = plan.replace(
    /FIRST_EXECUTION_TODO = REL-601\. HARD_STOP_AFTER = REL-600\. BLOCKING_ON = \[\]\. LAST_COMPLETED_TODO = REL-602\./,
    "FIRST_EXECUTION_TODO = REL-603. HARD_STOP_AFTER = REL-600. BLOCKING_ON = []. LAST_COMPLETED_TODO = REL-601.",
  );
}

fs.writeFileSync(planPath, plan);
console.log("plan patched for REL-601");
