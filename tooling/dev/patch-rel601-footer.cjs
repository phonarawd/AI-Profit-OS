const fs = require("fs");
const planPath = ".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md";
let plan = fs.readFileSync(planPath, "utf8");
plan = plan.replace("FIRST_EXECUTION_TODO = REL-601\nLAST_COMPLETED_TODO = REL-601", "FIRST_EXECUTION_TODO = REL-603\nLAST_COMPLETED_TODO = REL-601");
plan = plan.replace(
  "FIRST_EXECUTION_TODO = REL-601`. HARD_STOP_AFTER = REL-600. BLOCKING_ON = []. LAST_COMPLETED_TODO = REL-602.",
  "FIRST_EXECUTION_TODO = REL-603`. HARD_STOP_AFTER = REL-600. BLOCKING_ON = []. LAST_COMPLETED_TODO = REL-601.",
);
fs.writeFileSync(planPath, plan);
console.log("pointer fix done");
