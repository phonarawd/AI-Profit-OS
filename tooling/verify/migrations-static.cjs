/**
 * verify:migrations-static — supabase/migrations 정적 검증 (CI job `migration` · T2 · 원격 DB 0).
 *  - 파일명 규약 `YYYYMMDDHHMMSS_snake_case.sql` · 14자리 타임스탬프 중복 0 · 사전순 = 시간순
 *  - 빈 파일 0 · UTF-8 BOM 0 · 최소 1개 SQL 문 · `DROP DATABASE`/`DROP SCHEMA public` 0
 *    (줄바꿈은 검사하지 않는다 — Windows autocrlf 작업트리에서 index LF 파일이 CRLF 로 보인다)
 *  - supabase/staging/*.sql 도 같은 파일명 규약 (하드닝 리허설)
 *  - supabase/config.toml project_id = mgsytcetsiecllmhcyox (ADR-001 · project-isolation)
 * SQL 문법 파서는 레포에 없어 파싱 검증은 하지 않는다 (quality/backend-ci.md 후속 표기).
 */
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:migrations-static]";
const fails = [];
const NAME_RE = /^(\d{14})_[a-z0-9_]+\.sql$/;

function tracked(patterns) {
  return execFileSync("git", ["ls-files", "-z", "--", ...patterns], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"))
    .sort();
}

function checkDir(dir) {
  const files = tracked([dir + "/*.sql"]);
  if (!files.length) {
    fails.push(dir + ": no .sql files tracked");
    return 0;
  }
  const seen = new Map();
  let prev = "";
  for (const f of files) {
    const base = path.posix.basename(f);
    const m = base.match(NAME_RE);
    if (!m) {
      fails.push(f + ": filename must match YYYYMMDDHHMMSS_snake_case.sql");
      continue;
    }
    if (seen.has(m[1])) fails.push(f + ": timestamp prefix duplicates " + seen.get(m[1]));
    seen.set(m[1], f);
    if (prev && m[1] < prev) fails.push(f + ": timestamp is older than the previous file (" + prev + ")");
    prev = m[1];
    const buf = fs.readFileSync(path.join(root, f));
    if (buf.length === 0) {
      fails.push(f + ": empty migration");
      continue;
    }
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) fails.push(f + ": UTF-8 BOM");
    const text = buf.toString("utf8");
    const stripped = text.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const statements = stripped.split(";").map((s) => s.trim()).filter(Boolean);
    if (!statements.length) fails.push(f + ": no SQL statement (comments only)");
    if (/\bdrop\s+database\b/i.test(stripped)) fails.push(f + ": DROP DATABASE forbidden");
    if (/\bdrop\s+schema\s+public\b/i.test(stripped)) fails.push(f + ": DROP SCHEMA public forbidden");
  }
  return files.length;
}

const migrations = checkDir("supabase/migrations");
const staging = checkDir("supabase/staging");

const config = fs.existsSync(path.join(root, "supabase/config.toml")) ? fs.readFileSync(path.join(root, "supabase/config.toml"), "utf8") : "";
if (!config) fails.push("supabase/config.toml missing");
else if (!/project_id\s*=\s*"mgsytcetsiecllmhcyox"/.test(config)) fails.push("supabase/config.toml project_id must be mgsytcetsiecllmhcyox");

if (fails.length) {
  console.error(tag + " FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(tag + " PASS (" + migrations + " migrations · " + staging + " staging rehearsal files · naming/order/BOM/statement · remote 0)");
