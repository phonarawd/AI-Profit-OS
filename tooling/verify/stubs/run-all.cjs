/** Domain stubs — harden when apps/services land; copy/Canon locks run live */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const live = [
  "cta-earn-profit.cjs",
  "soft-hard-requeue-sla.cjs",
  "match-tension-surface.cjs",
  "auth-flows.cjs",
];

let failed = false;
for (const step of live) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "..", step)], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    failed = true;
    console.error(`[verify:stubs] FAIL at ${step}`);
    break;
  }
}

if (failed) process.exit(1);
console.log(
  "[verify:stubs] PASS (cta-earn-profit · soft-hard-requeue-sla · match-tension-surface · auth-flows live; other domain stubs pending)",
);
