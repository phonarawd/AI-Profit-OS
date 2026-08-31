"use strict";

/**
 * release-build에서 Worker를 미리 번들한다.
 * 산출물 = workers/<name>/.release-prebuilt (Wrangler --dry-run --outdir).
 * Production deploy는 이 파일을 --no-bundle로 올린다. 재번들 금지.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PREBUILT_DIR, WORKER_SNAPSHOTS, failClosed, findPrebuiltEntry } = require("./artifact-provenance.cjs");

function parseArgs(argv) {
  const out = { repoRoot: "", workers: WORKER_SNAPSHOTS.slice() };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--repo-root") out.repoRoot = argv[i + 1] || "";
    if (argv[i] === "--from-repo") out.repoRoot = out.repoRoot || path.resolve(__dirname, "../..");
    if (argv[i] === "--workers") {
      const raw = String(argv[i + 1] || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      if (raw.length) out.workers = raw;
    }
  }
  return out;
}

function prebuildOne(workerDir) {
  const outDir = path.join(workerDir, PREBUILT_DIR);
  fs.rmSync(outDir, { recursive: true, force: true });
  const result = spawnSync(
    "pnpm",
    ["exec", "wrangler", "deploy", "--dry-run", "--outdir", PREBUILT_DIR, "--config", "wrangler.toml"],
    { cwd: workerDir, stdio: "inherit", shell: true },
  );
  if (result.status !== 0) {
    throw failClosed("FAIL_CLOSED:worker_prebuild_failed", path.basename(workerDir));
  }
  const entry = findPrebuiltEntry(outDir);
  const meta = {
    schema: "release-worker-prebuilt.v1",
    entry: path.basename(entry),
    bundled_once: true,
    wrangler_no_upload: true,
  };
  fs.writeFileSync(path.join(outDir, "entry.json"), JSON.stringify(meta, null, 2) + "\n");
  return { worker: path.basename(workerDir), entry: path.basename(entry) };
}

function main(argv) {
  const args = parseArgs(argv);
  const repoRoot = path.resolve(args.repoRoot || path.resolve(__dirname, "../.."));
  const written = [];
  try {
    for (const name of args.workers) {
      if (!WORKER_SNAPSHOTS.includes(name)) {
        throw failClosed("FAIL_CLOSED:worker_prebuild_unknown", name);
      }
      const dir = path.join(repoRoot, "workers", name);
      if (!fs.existsSync(path.join(dir, "wrangler.toml"))) {
        throw failClosed("FAIL_CLOSED:artifact_missing", "workers/" + name + "/wrangler.toml");
      }
      written.push(prebuildOne(dir));
    }
  } catch (err) {
    const fails = err && err.fails ? err.fails : ["FAIL_CLOSED:" + (err && err.message ? err.message : err)];
    process.stderr.write("[prebuild-workers] FAIL_CLOSED\n- " + fails.join("\n- ") + "\n");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ schema: "release-worker-prebuild.v1", workers: written }, null, 2) + "\n");
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { parseArgs, prebuildOne };
