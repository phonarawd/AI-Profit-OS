/**
 * CI Nest 부트: 에페메럴 JWT 시크릿 · 빌드 확인 · start · health wait · teardown.
 * 제품 코드 변경 없음.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { ROOT } = require("../lib/hash-scope.cjs");
const { createEphemeralSecrets } = require("../lib/synthetic-identity.cjs");
const { resolveHarnessDatabaseUrl } = require("../kill-switch.cjs");

const DIST_MAIN = path.join(ROOT, "services/api-nest/dist/main.js");
const DIST_APP_MODULE = path.join(ROOT, "services/api-nest/dist/app.module.js");
const nestRequire = createRequire(path.join(ROOT, "services/api-nest/package.json"));

function defaultPaths(opts = {}) {
  const dir = opts.workDir || process.env.RUNNER_TEMP || path.join(ROOT, "_tmp_qa_harness");
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    logPath: opts.logPath || path.join(dir, "api-nest.log"),
    pidPath: opts.pidPath || path.join(dir, "api-nest.pid"),
  };
}

function assertDistPresent() {
  if (!fs.existsSync(DIST_MAIN)) {
    const err = new Error("api-nest dist/main.js missing — run pnpm --filter @aipo/api-nest build");
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }
}

function httpGet(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 500,
          status: res.statusCode,
          body,
        });
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, body: "", error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: "", error: "timeout" });
    });
  });
}

function startNest(opts = {}) {
  assertDistPresent();
  const paths = defaultPaths(opts);
  const port = Number(opts.port || process.env.PORT || 4000);
  const secrets = opts.secrets || createEphemeralSecrets();
  const extraEnv = opts.env || {};
  const logFd = fs.openSync(paths.logPath, "a");
  const child = spawn(process.execPath, [DIST_MAIN], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      JWT_USER_SECRET: secrets.jwtUserSecret,
      JWT_ADMIN_SECRET: secrets.jwtAdminSecret,
      DATABASE_URL: extraEnv.DATABASE_URL || resolveHarnessDatabaseUrl() || process.env.DATABASE_URL,
      ...extraEnv,
    },
    detached: process.platform !== "win32",
    stdio: ["ignore", logFd, logFd],
  });
  fs.closeSync(logFd);
  fs.writeFileSync(paths.pidPath, String(child.pid), "utf8");
  if (child.unref) child.unref();
  return {
    pid: child.pid,
    port,
    secrets,
    paths,
    child,
  };
}

async function waitForHealth(opts = {}) {
  const port = Number(opts.port || process.env.PORT || 4000);
  const url = opts.url || `http://127.0.0.1:${port}/api/v1/health`;
  const attempts = opts.attempts || 60;
  const delayMs = opts.delayMs || 2000;
  let last = "";
  for (let i = 0; i < attempts; i++) {
    const res = await httpGet(url);
    if (res.status === 200) {
      let parsed = null;
      try {
        parsed = JSON.parse(res.body);
      } catch {
        parsed = null;
      }
      return { ok: true, attempts: i + 1, status: res.status, body: parsed };
    }
    last = `status=${res.status} ${res.error || ""}`.trim();
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const err = new Error(`api-nest health timeout: ${last}`);
  err.code = "AIPO_QA_HARNESS_FAILURE";
  throw err;
}

function isPidAlive(pid) {
  const n = Number(pid);
  if (!n || !Number.isFinite(n)) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function stopNest(opts = {}) {
  const paths = defaultPaths(opts);
  let pid = opts.pid;
  if (!pid && fs.existsSync(paths.pidPath)) {
    pid = Number(fs.readFileSync(paths.pidPath, "utf8").trim());
  }
  if (!pid || !Number.isFinite(pid)) return { stopped: false, reason: "no_pid" };
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return { stopped: false, reason: "kill_failed", pid };
  }
  return { stopped: true, pid };
}

function collectLogs(opts = {}) {
  const paths = defaultPaths(opts);
  if (!fs.existsSync(paths.logPath)) return "";
  return fs.readFileSync(paths.logPath, "utf8").slice(-64_000);
}

function assertDistAppModulePresent() {
  if (!fs.existsSync(DIST_APP_MODULE)) {
    const err = new Error(
      "api-nest dist/app.module.js missing — run pnpm --filter @aipo/api-nest build",
    );
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }
}

/**
 * In-process boot (no child process) — required for the QA4 clock harness:
 * the SAME Node process that installs a synthetic clock via
 * services/api-nest/clock.core.cjs must be the process the booted Nest app
 * runs in, or the domain services would keep reading real system time from a
 * separate process's module cache. HTTP is real (app.listen); only the OS
 * process boundary is removed relative to startNest()/main.js.
 *
 * @param {{ port?: number, env?: Record<string,string> }} [opts]
 */
async function startNestInProcess(opts = {}) {
  assertDistAppModulePresent();
  const port = Number(opts.port || process.env.PORT || 4000);
  Object.assign(process.env, {
    PORT: String(port),
    NODE_ENV: process.env.NODE_ENV || "test",
    ...(opts.env || {}),
  });

  const { NestFactory } = nestRequire("@nestjs/core");
  const cookieParser = nestRequire("cookie-parser");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require(DIST_APP_MODULE);

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useBodyParser("json", { limit: "10mb" });
  app.setGlobalPrefix("api/v1");
  await app.listen(port);
  return { app, port };
}

async function stopNestInProcess(app) {
  if (app && typeof app.close === "function") {
    await app.close();
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  (async () => {
    if (cmd === "start") {
      const started = startNest({
        port: get("--port"),
        workDir: get("--work-dir"),
      });
      console.log(
        JSON.stringify({
          pid: started.pid,
          port: started.port,
          pidPath: started.paths.pidPath,
          secrets_committed: false,
        }),
      );
      return;
    }
    if (cmd === "wait-health") {
      const out = await waitForHealth({ port: get("--port"), url: get("--url") });
      console.log(JSON.stringify({ ok: out.ok, attempts: out.attempts, status: out.status }));
      return;
    }
    if (cmd === "stop") {
      console.log(JSON.stringify(stopNest({ pid: get("--pid") ? Number(get("--pid")) : undefined })));
      return;
    }
    console.error("usage: ci-nest-boot.cjs start|wait-health|stop");
    process.exit(2);
  })().catch((e) => {
    console.error(`[ci-nest-boot] FAIL ${e.message}`);
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  DIST_MAIN,
  DIST_APP_MODULE,
  assertDistPresent,
  assertDistAppModulePresent,
  startNest,
  startNestInProcess,
  stopNestInProcess,
  waitForHealth,
  stopNest,
  isPidAlive,
  collectLogs,
  httpGet,
  defaultPaths,
};
