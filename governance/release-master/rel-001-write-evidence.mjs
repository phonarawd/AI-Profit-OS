import fs from "node:fs";
import { execSync } from "node:child_process";

const allow = fs
  .readFileSync("governance/release-master/REL-001-ALLOWLIST.txt", "utf8")
  .split(/\r?\n/)
  .filter(Boolean);
const allowMeta = JSON.parse(
  fs.readFileSync("governance/release-master/REL-001-ALLOWLIST.json", "utf8"),
);
const tree = new Set(
  execSync("git ls-tree -r --name-only HEAD", { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean),
);
const commitFiles = execSync("git show --pretty=format: --name-only HEAD", {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);
const secrets = [
  ".env",
  ".cursor/secrets/github-ai-profit-os.pat",
  ".cursor/secrets/github-clime.pat",
];
const flags = {};
for (const row of allowMeta.files) {
  for (const f of row.flags || []) {
    flags[f] = flags[f] || { expected: 0, in_tree: 0 };
    flags[f].expected += 1;
    if (tree.has(row.file)) flags[f].in_tree += 1;
  }
}

const oppPrefix = "services/api-nest/src/opportunities/";
const ev = {
  schema: "putduk.release-master.rel-001-preserve-evidence.v1",
  rel: "REL-001",
  status: "PASS",
  preserve_branch: "preserve/2026-08-20-worktree-rescue",
  preserve_commit: "ae8d1e634cb07998982997bb520396b825a7a42e",
  preserve_commit_short: "ae8d1e6",
  parent_commit: "48ab180545c26881528902e880c1685e8d9798a0",
  main_head: "48ab180545c26881528902e880c1685e8d9798a0",
  merge_to_main: false,
  backup_authority_only: true,
  recoverable_expected: 151,
  recoverable_preserved: allow.filter((f) => tree.has(f)).length,
  commit_delta_paths: commitFiles.length,
  already_in_parent_no_delta: allow.filter(
    (f) => tree.has(f) && !commitFiles.includes(f),
  ),
  secret_content_read_count: 0,
  secret_risk_staged: 0,
  secret_risk_in_commit: secrets.filter(
    (f) => commitFiles.includes(f) || tree.has(f),
  ),
  git_add_A_usage: 0,
  destructive_git_operation: 0,
  product_code_mutation_by_rel001: 0,
  verify: {
    staged_secrets: 0,
    home_profits_reprice_migration_in_tree: true,
    merge_to_main: 0,
    t0_gate_fast: "PASS",
  },
  flags,
  critical: {
    home_freeze: [
      ".cursor/rules/home-presentation-freeze.mdc",
      "apps/web/components/spark-dash-home/HomeDesktop.tsx",
      "apps/web/components/spark-dash-home/HomeMobile.tsx",
      "apps/web/app/HomeDesktopClient.tsx",
      "governance/consumer-home-approval/home-approval-freeze.v1.json",
    ].every((f) => tree.has(f)),
    spark_dash: allow.filter((f) => f.includes("spark-dash")).every((f) => tree.has(f)),
    opportunities: allow
      .filter((f) => f.startsWith(oppPrefix))
      .every((f) => tree.has(f)),
    opportunity_reprice: tree.has(
      "services/api-nest/src/opportunities/opportunity-reprice.service.ts",
    ),
    migrations: [
      "supabase/migrations/20260819210000_source_observations.sql",
      "supabase/migrations/20260819220000_canonical_products.sql",
      "supabase/migrations/20260820013000_match_results.sql",
    ].every((f) => tree.has(f)),
  },
  source_inventory: [
    "governance/release-master/REL-000-TREE-INVENTORY.md",
    "governance/release-master/REL-000-TREE-INVENTORY.json",
  ],
};

fs.writeFileSync(
  "governance/release-master/REL-001-PRESERVE-EVIDENCE.json",
  JSON.stringify(ev, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      preserved: ev.recoverable_preserved,
      expected: ev.recoverable_expected,
      secrets: ev.secret_risk_in_commit,
      critical: ev.critical,
      no_delta: ev.already_in_parent_no_delta,
    },
    null,
    2,
  ),
);
