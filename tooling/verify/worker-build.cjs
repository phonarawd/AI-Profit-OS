/**
 * verify:worker-build — 트리의 모든 백엔드 Worker 를 wrangler 로 번들만 한다 (CI job `worker-build` · T2).
 * 대상 = git 추적 `workers/* /wrangler.toml` 전부 (소유권 JSON decision 을 함께 표시 · KEEP 이 아닌 worker 의 실패도 숨기지 않는다).
 * 명령 = `pnpm exec wrangler deploy --dry-run --outdir dist-ci --config wrangler.toml` (release prebuild 와 같은 형태 · 업로드 0 · 자격증명 0).
 * 하나라도 실패하면 exit 1 · dist-ci 는 실행 후 삭제.
 */
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:worker-build]";
const OUT_DIR = "dist-ci";

const configs = execFileSync("git", ["ls-files", "-z", "--", "workers/*/wrangler.toml"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .map((p) => p.replace(/\\/g, "/"))
  .sort();

if (!configs.length) {
  console.error(tag + " FAIL no workers/*/wrangler.toml tracked");
  process.exit(1);
}

let decisions = new Map();
try {
  const own = JSON.parse(fs.readFileSync(path.join(root, "quality/backend-file-ownership.json"), "utf8"));
  decisions = new Map(own.files.map((f) => [f.path, f.decision]));
} catch {
  decisions = new Map();
}

const only = process.argv.includes("--only") ? String(process.argv[process.argv.indexOf("--only") + 1] || "").split(",").filter(Boolean) : null;
const listOnly = process.argv.includes("--list");

const results = [];
for (const cfg of configs) {
  const dir = path.posix.dirname(cfg);
  const name = path.posix.basename(dir);
  if (only && !only.includes(name)) continue;
  const decision = decisions.get(cfg) || "?";
  if (listOnly) {
    console.log(tag + " " + name + " (" + decision + ")");
    continue;
  }
  const outAbs = path.join(root, dir, OUT_DIR);
  fs.rmSync(outAbs, { recursive: true, force: true });
  const started = Date.now();
  const r = spawnSync("pnpm", ["exec", "wrangler", "deploy", "--dry-run", "--outdir", OUT_DIR, "--config", "wrangler.toml"], {
    cwd: path.join(root, dir),
    encoding: "utf8",
    shell: true,
    env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
    maxBuffer: 64 * 1024 * 1024,
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const bundled = fs.existsSync(outAbs) && fs.readdirSync(outAbs).some((f) => /\.m?js$/.test(f));
  const ok = r.status === 0 && bundled;
  if (!ok) {
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
  }
  results.push({ name, decision, ok, elapsed });
  console.log(tag + " " + (ok ? "ok  " : "FAIL") + " " + name.padEnd(28) + " decision=" + decision.padEnd(6) + " (" + elapsed + "s" + (ok ? "" : " · exit " + r.status + (bundled ? "" : " · no bundle")) + ")");
  fs.rmSync(outAbs, { recursive: true, force: true });
}

if (listOnly) process.exit(0);
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(tag + " FAIL (" + failed.length + "/" + results.length + ": " + failed.map((f) => f.name + "[" + f.decision + "]").join(", ") + ")");
  process.exit(1);
}
console.log(tag + " PASS (" + results.length + " workers bundled with wrangler --dry-run · upload 0)");
