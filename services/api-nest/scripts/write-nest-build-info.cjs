/**
 * 빌드 시 Git SHA·시각을 공개 health용 JSON으로 고정한다.
 * 런타임 git 명령 없음. 비밀 env를 쓰지 않는다.
 *
 * SHA 우선순위: CF_PAGES_COMMIT_SHA → RENDER_GIT_COMMIT → GITHUB_SHA → git rev-parse HEAD
 * 런타임 health는 RENDER_GIT_COMMIT만 읽는다. 이 스크립트는 빌드 전용이다.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const SHA_RE = /^[0-9a-f]{7,40}$/i;
const out = path.join(__dirname, "..", "src", "config", "nest-build-info.generated.json");

function readSha(raw) {
  const value = String(raw ?? "").trim();
  return SHA_RE.test(value) ? value.toLowerCase() : null;
}

function fromGit() {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return readSha(sha);
  } catch {
    return null;
  }
}

const bakedGitSha =
  readSha(process.env.CF_PAGES_COMMIT_SHA) ||
  readSha(process.env.RENDER_GIT_COMMIT) ||
  readSha(process.env.GITHUB_SHA) ||
  fromGit();

const body = {
  version: "0.0.0",
  buildTime: new Date().toISOString(),
  bakedGitSha,
};

fs.writeFileSync(out, `${JSON.stringify(body, null, 2)}\n`, "utf8");
process.stdout.write(`[write-nest-build-info] wrote ${path.relative(process.cwd(), out)}\n`);
