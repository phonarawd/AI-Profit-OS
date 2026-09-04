#!/usr/bin/env node
/**
 * Deploy user PWA to CF Workers (OpenNext).
 * Filename cf-pages-web is legacy; actual path is Workers deploy.
 * staging/preview = env preview (ai-profit-web-preview, REL-600)
 * production = env production (ai-profit-web)
 */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  root,
  requireRootDomainForProd,
  requireCloudflareCreds,
  mustExist,
  loadDotEnv,
  resolveWranglerEnv,
} = require("./lib/env.cjs");
const {
  isProductionTarget,
  requireAcceptedArtifactAuthority,
} = require("./lib/accepted-artifact-authority.cjs");

const argv = process.argv.slice(2);
const noRebuild = argv.includes("--no-rebuild");
const target = argv.find((arg) => !arg.startsWith("--")) || "preview";
if (isProductionTarget(target)) {
  try {
    requireAcceptedArtifactAuthority(target, process.env);
  } catch (err) {
    console.error("[cf:deploy:web] " + String(err && err.message ? err.message : err));
    process.exit(1);
  }
  if (!noRebuild) {
    console.error("[cf:deploy:web] FAIL_CLOSED:production_rebuild_forbidden");
    process.exit(1);
  }
}
requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();
mustExist("apps/web/package.json", "apps/web");

const appDir = path.join(root, "apps/web");
const configPath = path.join(root, "infra/web/wrangler.toml");
const envFlag = resolveWranglerEnv(target);
const smokeSlot = envFlag === "production" ? "production" : "staging";

function spawnEnv() {
  const env = { ...process.env };
  if (process.platform === "win32") {
    const shim = path.join(__dirname, "win32-symlink-shim.cjs");
    const prev = env.NODE_OPTIONS || "";
    env.NODE_OPTIONS = `--require ${shim}${prev ? ` ${prev}` : ""}`;
    env.NODE_ENV = env.NODE_ENV || "production";
  }
  return env;
}

if (noRebuild) {
  mustExist("apps/web/.open-next/worker.js", "apps/web OpenNext worker");
  mustExist("apps/web/.open-next/assets", "apps/web OpenNext assets");
  console.log("[cf:deploy:web] no-rebuild · wrangler only");
} else {
  console.log("[cf:deploy:web] building apps/web");
  const build = spawnSync("pnpm", ["--filter", "@aipo/web", "build:cf"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: spawnEnv(),
  });
  if (build.status !== 0) process.exit(build.status || 1);
}

const deployArgs = noRebuild
  // REL-701 2026-09-04: --no-bundle을 쓰면 wrangler가 esbuild를 건너뛰어
  // worker.js가 상대 경로로 import하는 sibling 모듈(OpenNext가 만드는 images.js 등)을
  // 못 찾고 "No such module" (code 10021)로 배포가 거부된다.
  // 일반 deploy 경로(else 분기)는 --no-bundle을 쓰지 않는다 — 여기서도 동일하게 일반
  // bundling으로 맞춘다. Next.js/OpenNext 재빌드(rebuild)는 여전히 스킵,
  // wrangler의 esbuild 패키징 단계만 정상적으로 돈다(재현 가능한 순수 기계적 단계, digest 검증은 이 이전에 끝남).
  ? ["exec", "wrangler", "deploy", "--config", configPath, "--env=" + envFlag]
  : [
      "exec",
      "opennextjs-cloudflare",
      "deploy",
      "--config=" + configPath,
      "--env=" + envFlag,
    ];

console.log("[cf:deploy:web] OpenNext Workers deploy target=" + envFlag + " smoke=" + smokeSlot);
const deploy = spawnSync("pnpm", deployArgs, {
  cwd: noRebuild ? root : appDir,
  stdio: "inherit",
  shell: true,
  env: spawnEnv(),
});
if (deploy.status !== 0) process.exit(deploy.status || 1);

console.log("[cf:deploy:web] origin smoke");
const smoke = spawnSync(
  "node",
  [path.join(__dirname, "cf-origin-smoke.cjs"), "web", smokeSlot],
  { cwd: root, stdio: "inherit", shell: true, env: spawnEnv() }
);
process.exit(smoke.status || 0);
