/**
 * #81 — domain-by-path committed-diff selftest.
 * 임시 git 저장소로 clean checkout / staged / unstaged / CI fail-closed를 재현한다.
 */
"use strict";

const { execSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  getChangedFiles,
  scriptsForChangedFiles,
  detectDiffMode,
} = require("./domain-by-path.cjs");

const root = path.resolve(__dirname, "../..");
const cases = [];
const realHeadBefore = execSync("git rev-parse HEAD", {
  cwd: root,
  encoding: "utf8",
}).trim();

function expect(name, cond, detail) {
  cases.push({ name, pass: !!cond, detail: detail || "" });
}

function gitEnv() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  delete env.GIT_PREFIX;
  return env;
}

function git(cwd, args) {
  return execSync("git " + args, {
    cwd,
    encoding: "utf8",
    env: gitEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeFile(cwd, rel, body) {
  const abs = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
}

function initRepo() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-domain-diff-"));
  git(cwd, "init -b main");
  const top = path.resolve(git(cwd, "rev-parse --show-toplevel").trim());
  if (top !== path.resolve(cwd)) {
    throw new Error("GIT isolation failed: toplevel=" + top + " cwd=" + cwd);
  }
  git(cwd, 'config user.email "domain-diff@test.local"');
  git(cwd, 'config user.name "domain-diff"');
  writeFile(cwd, "README.md", "base\n");
  git(cwd, "add README.md");
  git(cwd, 'commit -m base');
  return cwd;
}

function sha(cwd, rev) {
  return git(cwd, "rev-parse " + (rev || "HEAD")).trim();
}

function cleanCheckout(cwd) {
  git(cwd, "reset --hard HEAD");
  git(cwd, "clean -fd");
}

function listMain(cwd, env) {
  const r = spawnSync(process.execPath, [path.join(root, "tooling/verify/domain-by-path.cjs")], {
    cwd,
    encoding: "utf8",
    env: {
      ...gitEnv(),
      ...env,
      AIPO_DOMAIN_BY_PATH_LIST_ONLY: "1",
      AIPO_DOMAIN_DIFF_CWD: cwd,
    },
  });
  let json = null;
  try {
    json = JSON.parse(String(r.stdout || "").trim().split(/\r?\n/).pop());
  } catch {
    json = null;
  }
  return { status: r.status, json, stderr: String(r.stderr || "") };
}

const WALLET = "packages/sdk/src/wallet/fetch.ts";
const AUTH = "services/api-nest/src/auth/auth.controller.ts";

// 1. clean checkout + committed wallet
{
  const cwd = initRepo();
  const base = sha(cwd);
  writeFile(cwd, WALLET, "export const wallet = 1;\n");
  git(cwd, "add -- " + WALLET);
  git(cwd, 'commit -m wallet');
  const head = sha(cwd);
  cleanCheckout(cwd);
  const files = getChangedFiles({
    cwd,
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
      AIPO_PR_BASE_SHA: base,
      GITHUB_SHA: head,
    },
  });
  const scripts = scriptsForChangedFiles(files);
  expect("1 clean+committed wallet files", files.includes(WALLET), files.join(","));
  expect(
    "1 mapped wallet-closure",
    scripts.includes("wallet-closure.cjs"),
    scripts.join(","),
  );
  const listed = listMain(cwd, {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "pull_request",
    AIPO_PR_BASE_SHA: base,
    GITHUB_SHA: head,
  });
  expect(
    "1 verifier names executed via list-only",
    listed.status === 0 &&
      listed.json &&
      listed.json.scripts.includes("wallet-closure.cjs"),
    JSON.stringify(listed.json),
  );
  fs.rmSync(cwd, { recursive: true, force: true });
}

// 2. clean checkout + committed auth
{
  const cwd = initRepo();
  const base = sha(cwd);
  writeFile(cwd, AUTH, "export const auth = 1;\n");
  git(cwd, "add -- " + AUTH);
  git(cwd, 'commit -m auth');
  const head = sha(cwd);
  cleanCheckout(cwd);
  const files = getChangedFiles({
    cwd,
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "push",
      AIPO_PUSH_BEFORE_SHA: base,
      GITHUB_SHA: head,
    },
  });
  const scripts = scriptsForChangedFiles(files);
  expect("2 clean+committed auth files", files.includes(AUTH), files.join(","));
  expect(
    "2 mapped auth-jwt-runtime",
    scripts.includes("auth-jwt-runtime.cjs"),
    scripts.join(","),
  );
  fs.rmSync(cwd, { recursive: true, force: true });
}

// 3. multiple commits
{
  const cwd = initRepo();
  const base = sha(cwd);
  writeFile(cwd, WALLET, "export const wallet = 1;\n");
  git(cwd, "add -- " + WALLET);
  git(cwd, 'commit -m wallet');
  writeFile(cwd, AUTH, "export const auth = 1;\n");
  git(cwd, "add -- " + AUTH);
  git(cwd, 'commit -m auth');
  const head = sha(cwd);
  cleanCheckout(cwd);
  const files = getChangedFiles({
    cwd,
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
      AIPO_PR_BASE_SHA: base,
      GITHUB_SHA: head,
    },
  });
  const scripts = scriptsForChangedFiles(files);
  expect(
    "3 multi-commit files",
    files.includes(WALLET) && files.includes(AUTH),
    files.join(","),
  );
  expect(
    "3 multi-commit mapped both",
    scripts.includes("wallet-closure.cjs") && scripts.includes("auth-jwt-runtime.cjs"),
    scripts.join(","),
  );
  fs.rmSync(cwd, { recursive: true, force: true });
}

// 4. legitimate no-change
{
  const cwd = initRepo();
  const head = sha(cwd);
  cleanCheckout(cwd);
  const files = getChangedFiles({
    cwd,
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "push",
      AIPO_PUSH_BEFORE_SHA: head,
      GITHUB_SHA: head,
    },
  });
  expect("4 no-change empty", files.length === 0, files.join(","));
  fs.rmSync(cwd, { recursive: true, force: true });
}

// 5. missing/invalid CI base fail closed
{
  let threw = "";
  try {
    getChangedFiles({
      cwd: root,
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_SHA: "abc1234",
      },
    });
  } catch (err) {
    threw = String(err && err.code);
  }
  expect("5 missing PR base fail closed", threw === "CI_PR_BASE_UNRESOLVED", threw);

  threw = "";
  try {
    getChangedFiles({
      cwd: root,
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "push",
        AIPO_PUSH_BEFORE_SHA: "0000000000000000000000000000000000000000",
        GITHUB_SHA: "abc1234",
      },
    });
  } catch (err) {
    threw = String(err && err.code);
  }
  expect("5 zero before SHA fail closed", threw === "CI_PUSH_BASE_UNRESOLVED", threw);

  threw = "";
  try {
    getChangedFiles({
      cwd: root,
      env: { GITHUB_ACTIONS: "true" },
    });
  } catch (err) {
    threw = String(err && err.code);
  }
  expect("5 unknown CI event fail closed", threw === "CI_CONTEXT_UNRESOLVED", threw);
}

// 6. local staged
{
  const cwd = initRepo();
  writeFile(cwd, WALLET, "export const wallet = staged;\n");
  git(cwd, "add -- " + WALLET);
  const files = getChangedFiles({ cwd, env: { AIPO_DOMAIN_DIFF_MODE: "local" } });
  const scripts = scriptsForChangedFiles(files);
  expect("6 local staged wallet", files.includes(WALLET), files.join(","));
  expect("6 local staged maps wallet-closure", scripts.includes("wallet-closure.cjs"));
  fs.rmSync(cwd, { recursive: true, force: true });
}

// 7. local unstaged
{
  const cwd = initRepo();
  writeFile(cwd, WALLET, "export const wallet = 1;\n");
  git(cwd, "add -- " + WALLET);
  git(cwd, 'commit -m wallet');
  writeFile(cwd, WALLET, "export const wallet = unstaged;\n");
  const files = getChangedFiles({ cwd, env: { AIPO_DOMAIN_DIFF_MODE: "local" } });
  const scripts = scriptsForChangedFiles(files);
  expect("7 local unstaged wallet", files.includes(WALLET), files.join(","));
  expect("7 local unstaged maps wallet-closure", scripts.includes("wallet-closure.cjs"));
  fs.rmSync(cwd, { recursive: true, force: true });
}

const realHeadAfter = execSync("git rev-parse HEAD", {
  cwd: root,
  encoding: "utf8",
}).trim();
expect(
  "real repo HEAD unchanged",
  realHeadAfter === realHeadBefore,
  realHeadBefore + " → " + realHeadAfter,
);

expect("detect local default", detectDiffMode({}) === "local");
expect(
  "detect ci_pr",
  detectDiffMode({ GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "pull_request" }) ===
    "ci_pr",
);

const failed = cases.filter((c) => !c.pass);
const report = {
  VERIFY: failed.length === 0 ? "PASS" : "FAIL",
  unit: cases.filter((c) => c.pass).length + "/" + cases.length,
  failed: failed.map((c) => c.name + (c.detail ? " :: " + c.detail : "")),
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(failed.length === 0 ? 0 : 1);
