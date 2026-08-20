/**
 * REL-001 — REL-000 inventory → recoverable allowlist.
 * secret-risk / tmp / ignored 경로 제외. 시크릿 파일 내용 READ 0.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const invPath = path.join(root, "governance/release-master/REL-000-TREE-INVENTORY.json");
const outList = path.join(root, "governance/release-master/REL-001-ALLOWLIST.txt");
const outJson = path.join(root, "governance/release-master/REL-001-ALLOWLIST.json");

const SECRET_RISK = [
  ".env",
  ".cursor/secrets/github-ai-profit-os.pat",
  ".cursor/secrets/github-clime.pat",
];

const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));
const secretSet = new Set([
  ...SECRET_RISK,
  ...(inv.ignored_secret_risk_paths || []),
]);

const recoverable = [];
const excluded = [];

for (const item of inv.items || []) {
  const file = String(item.file || "").replace(/\\/g, "/");
  if (!file) continue;
  if (secretSet.has(file) || item.git_class === "secret-risk" || item.bucket === "secret-risk") {
    excluded.push({ file, reason: "secret-risk" });
    continue;
  }
  if (item.bucket === "tmp" || item.git_class === "tmp") {
    excluded.push({ file, reason: "tmp" });
    continue;
  }
  if (item.bucket !== "recoverable") {
    continue;
  }
  recoverable.push({
    file,
    git_class: item.git_class,
    flags: item.recoverable_flags || [],
    protected_scope: !!item.protected_scope,
  });
}

recoverable.sort((a, b) => a.file.localeCompare(b.file));

const missing = [];
const present = [];
for (const row of recoverable) {
  const abs = path.join(root, row.file);
  if (fs.existsSync(abs)) present.push(row.file);
  else missing.push(row.file);
}

fs.writeFileSync(outList, recoverable.map((r) => r.file).join("\n") + "\n", "utf8");
fs.writeFileSync(
  outJson,
  JSON.stringify(
    {
      schema: "putduk.release-master.rel-001-allowlist.v1",
      source_inventory: "governance/release-master/REL-000-TREE-INVENTORY.json",
      recoverable_expected: inv.counts?.recoverable ?? null,
      recoverable_allowlist: recoverable.length,
      present: present.length,
      missing,
      secret_risk_excluded: SECRET_RISK,
      excluded_from_allowlist_count: excluded.length,
      flags: [...new Set(recoverable.flatMap((r) => r.flags))].sort(),
      files: recoverable,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(
  JSON.stringify(
    {
      recoverable_expected: inv.counts?.recoverable ?? null,
      recoverable_allowlist: recoverable.length,
      present: present.length,
      missing_count: missing.length,
      missing,
      secret_in_allowlist: recoverable.filter((r) => secretSet.has(r.file)).map((r) => r.file),
    },
    null,
    2,
  ),
);
