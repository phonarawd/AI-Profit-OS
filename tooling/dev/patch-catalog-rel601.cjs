const fs = require("fs");
const p = "tooling/verify/CATALOG.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("rel-601-staging-regression")) {
  console.log("already");
  process.exit(0);
}
s = s.replace(
  "| rel-602-staging-rollback | `verify:rel-602-staging-rollback` | T0 path + CI | live (REL-602 CF Worker version control staging rollback practice) |\n",
  "| rel-602-staging-rollback | `verify:rel-602-staging-rollback` | T0 path + CI | live (REL-602 CF Worker version control staging rollback practice) |\n| rel-601-staging-regression | `verify:rel-601-staging-regression` | T0 path + CI | live (REL-601 Surface Matrix staging regression) |\n",
);
s = s.replace(
  "| `governance/release-master/REL-602-STAGING-ROLLBACK.md`",
  "| `governance/release-master/REL-601-STAGING-REGRESSION.md` · staging-regression matrix · `run-staging-regression.cjs` | rel-601-staging-regression |\n| `governance/release-master/REL-602-STAGING-ROLLBACK.md`",
);
fs.writeFileSync(p, s);
console.log("updated");
