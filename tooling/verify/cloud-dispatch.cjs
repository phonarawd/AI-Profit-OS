/**
 * 이 PC(저사양)에서 로컬 install/gate/build를 대신할 GitHub 클라우드 검증 디스패처.
 * node_modules 불필요. 배포·migration·시크릿 변경 0.
 *
 *   node tooling/verify/cloud-dispatch.cjs --suite ui
 *   pnpm verify:cloud -- --suite full
 */
const { spawnSync } = require("child_process");

const ALLOWED_SUITES = new Set(["fast", "push", "full", "ui"]);
const WORKFLOW = "cloud-verify.yml";

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function runGh(args, opts = {}) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    stdio: opts.stdio || ["ignore", "pipe", "pipe"],
  });
  return result;
}

function fail(code, message) {
  console.error(`[verify:cloud] ${code}`);
  console.error(message);
  process.exit(1);
}

const suite = argValue("--suite", "ui");
if (!ALLOWED_SUITES.has(suite)) {
  fail("BLOCKED", `unknown --suite ${suite}. use fast|push|full|ui`);
}

const watch = !process.argv.includes("--no-watch");
const branchResult = spawnSync("git", ["branch", "--show-current"], {
  encoding: "utf8",
});
const branch = (branchResult.stdout || "").trim();
if (!branch) fail("BLOCKED", "current branch is empty");
if (branch === "main") {
  fail("BLOCKED", "refusing to dispatch Cloud verify as a path to origin/main");
}

const ghWho = runGh(["auth", "status"]);
if (ghWho.status !== 0) {
  fail("BLOCKED", "gh auth is required. Cloud verify cannot run locally.");
}

const remote = runGh(["ls-remote", "--heads", "origin", branch]);
if (remote.status !== 0 || !(remote.stdout || "").includes(branch)) {
  fail(
    "BLOCKED",
    `origin/${branch} is missing. push this branch first, then re-run.\n` +
      "Do not pnpm install on this PC. Do not --no-verify."
  );
}

console.log(`[verify:cloud] dispatch ${WORKFLOW} suite=${suite} ref=${branch}`);
const dispatched = runGh([
  "workflow",
  "run",
  WORKFLOW,
  "--ref",
  branch,
  "-f",
  `suite=${suite}`,
]);
if (dispatched.status !== 0) {
  fail(
    "BLOCKED",
    `gh workflow run failed.\n${dispatched.stderr || dispatched.stdout || ""}\n` +
      "The workflow file must exist on the remote branch."
  );
}

if (!watch) {
  console.log("[verify:cloud] dispatched. --no-watch set, not waiting.");
  process.exit(0);
}

const list = runGh([
  "run",
  "list",
  "--workflow",
  WORKFLOW,
  "--branch",
  branch,
  "--limit",
  "1",
  "--json",
  "databaseId,url,status,conclusion",
]);
if (list.status !== 0) {
  fail("BLOCKED", `could not list workflow runs.\n${list.stderr || ""}`);
}

let runId = "";
try {
  const rows = JSON.parse(list.stdout || "[]");
  runId = rows[0] && String(rows[0].databaseId || "");
} catch {
  runId = "";
}
if (!runId) fail("BLOCKED", "no Cloud verify run id after dispatch");

console.log(`[verify:cloud] watching run ${runId}`);
const watched = runGh(["run", "watch", runId, "--exit-status"], {
  stdio: "inherit",
});
if (watched.status !== 0) {
  fail("FAIL", `Cloud verify run ${runId} did not finish green.`);
}

console.log("[verify:cloud] PASS");
console.log("  AI_CHAT_RELEASE_READY=NO");
console.log("  auth ops smoke / axe live / Lighthouse-CWV live / AI Chat V2 = NOT RUN");
process.exit(0);
