/**
 * REL-017 — workspace .cursor/plans 권위 스탬프만.
 * Home %USERPROFILE%\\.cursor\\plans 쓰기 거부. sync-plans 호출 0. 파일 삭제 0.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const registry = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/legacy-plan-migration/registry.v1.json"),
    "utf8",
  ),
);

const homePlans = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "plans",
);

function assertWorkspaceOnly(targetDir) {
  const resolved = path.resolve(targetDir);
  const home = path.resolve(homePlans);
  if (resolved.toLowerCase() === home.toLowerCase()) {
    throw new Error("DENY: Home Cursor plans path");
  }
  if (resolved.toLowerCase().startsWith(home.toLowerCase() + path.sep)) {
    throw new Error("DENY: write under Home Cursor plans");
  }
  const allowRoot = path.resolve("C:/Users/PC/Desktop/AI_PROFIT_OS");
  const relToAllow = path.relative(allowRoot, resolved);
  if (relToAllow.startsWith("..") || path.isAbsolute(relToAllow)) {
    throw new Error("DENY: plans dir outside AI_PROFIT_OS workspace");
  }
  if (!/[\\/]\.cursor[\\/]plans$/i.test(resolved)) {
    throw new Error("stamp target must be a .cursor/plans directory");
  }
}

function stampBlock(entry) {
  const lines = [
    "<!-- REL-017-AUTHORITY-STAMP -->",
    "```text",
    "EXECUTION_AUTHORITY = NO",
  ];
  if (entry.contentAuthority === "YES") {
    lines.push("CONTENT_AUTHORITY = YES");
    lines.push(
      "SUPERSEDED_FOR_EXECUTION_BY = PUTDUK_RELEASE_MASTER.plan.md",
    );
  } else {
    lines.push("CONTENT_AUTHORITY = NO");
    lines.push("HISTORICAL_REFERENCE_ONLY = YES");
    lines.push("DO_NOT_EXECUTE = YES");
    lines.push("SUPERSEDED_BY = PUTDUK_RELEASE_MASTER.plan.md");
  }
  lines.push("```");
  lines.push("<!-- /REL-017-AUTHORITY-STAMP -->");
  return `\n${lines.join("\n")}\n`;
}

function applyOne(filePath, entry) {
  const raw = fs.readFileSync(filePath);
  const hasBom =
    raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = (hasBom ? raw.subarray(3) : raw).toString("utf8");
  text = text.replace(
    /\r?\n?<!-- REL-017-AUTHORITY-STAMP -->[\s\S]*?<!-- \/REL-017-AUTHORITY-STAMP -->\r?\n?/,
    "",
  );
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (!fm) throw new Error(`no YAML frontmatter: ${entry.file}`);
  const next = text.slice(0, fm[0].length) + stampBlock(entry) + text.slice(fm[0].length);
  if (!next.startsWith("---")) throw new Error(`frontmatter drift: ${entry.file}`);
  // BOM은 integrity가 거부한다. 스탬프 시 제거. todo status는 그대로.
  fs.writeFileSync(filePath, next, "utf8");
}

function main() {
  const argDir = process.argv.includes("--plans-dir")
    ? process.argv[process.argv.indexOf("--plans-dir") + 1]
    : "";
  const plansDir = path.resolve(argDir || path.join(root, ".cursor", "plans"));
  assertWorkspaceOnly(plansDir);
  let stamped = 0;
  let missing = 0;
  for (const entry of registry.files) {
    const p = path.join(plansDir, entry.file);
    if (!fs.existsSync(p)) {
      missing += 1;
      continue;
    }
    applyOne(p, entry);
    stamped += 1;
  }
  console.log(
    `[legacy-plan-stamp] workspace-only stamped=${stamped} missing=${missing} sync-plans=0 homeWrite=0`,
  );
}

main();
