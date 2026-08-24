/**
 * 로컬 consumer web 런타임.
 * production/Workers/pages.dev 를 QA fallback으로 쓰지 않는다.
 * PLAYWRIGHT_BASE_URL이 없어도 Cursor/CI가 loopback Next를 기동한다.
 * LOCAL_WEB_RUNTIME_MODE=production이면 이미 생성된 .next production build를
 * `next start`로 기동해 실제 production CSP/렌더링 조건을 검증한다.
 * LOCAL_WEB_RUNTIME_API_STUB=1이면 API_HOST의 loopback 포트에 fail-closed 401
 * API stub을 열어 시각/반응형 QA가 외부 API 가용성에 오염되지 않게 한다.
 */
"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const PRODUCTION_HOST_FRAGMENTS = [
  "hiptk.app",
  "ai-profit-web.ebay-adapter.workers.dev",
  "ai-profit-ops.ebay-adapter.workers.dev",
  "ai-profit-web.pages.dev",
  "ai-profit-ops.pages.dev",
];

function assertSafeBaseUrl(raw) {
  const url = new URL(String(raw || ""));
  const host = url.hostname.toLowerCase();
  if (
    PRODUCTION_HOST_FRAGMENTS.some(
      (frag) => host === frag || host.endsWith(`.${frag}`),
    )
  ) {
    throw new Error("local-web-runtime: production host denied");
  }
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(`local-web-runtime: loopback only (got ${host})`);
  }
  return url.origin;
}

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolve(typeof res.statusCode === "number" && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > start + 30) {
        reject(new Error("local-web-runtime: no free port"));
        return;
      }
      const server = net.createServer();
      server.once("error", () => tryPort(port + 1));
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(start);
  });
}

function stopChild(child) {
  if (!child || child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function localApiEndpoint(raw) {
  const value = String(raw || "127.0.0.1:4000");
  const url = new URL(
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `http://${value}`,
  );
  const host = url.hostname.toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(`local-web-runtime: API stub must be loopback (got ${host})`);
  }
  if (url.protocol !== "http:") {
    throw new Error("local-web-runtime: API stub only supports loopback http");
  }
  return {
    host: host === "localhost" ? "127.0.0.1" : host,
    port: Number(url.port || 80),
  };
}

function startApiStub() {
  if (process.env.LOCAL_WEB_RUNTIME_API_STUB !== "1") return Promise.resolve(null);
  const endpoint = localApiEndpoint(process.env.API_HOST);
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ message: "QA_AUTH_REQUIRED" }));
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(endpoint.port, endpoint.host, () => resolve(server));
  });
}

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve) => server.close(() => resolve()));
}

/**
 * @returns {Promise<{ baseUrl: string, started: boolean, stop: () => Promise<void> }>}
 */
async function ensureLocalWebRuntime(opts = {}) {
  const existing = process.env.PLAYWRIGHT_BASE_URL;
  if (existing) {
    const baseUrl = assertSafeBaseUrl(existing);
    const ok = await probe(baseUrl);
    if (!ok) {
      throw new Error("local-web-runtime: PLAYWRIGHT_BASE_URL not reachable");
    }
    return { baseUrl, started: false, stop: async () => {} };
  }

  const port = await findFreePort(Number(opts.port) || 3000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const webRoot = path.join(ROOT, "apps/web");
  const nextBin = path.join(webRoot, "node_modules/next/dist/bin/next");
  if (!fs.existsSync(nextBin)) {
    throw new Error("local-web-runtime: next binary missing in apps/web");
  }

  const productionMode = process.env.LOCAL_WEB_RUNTIME_MODE === "production";
  if (productionMode) {
    const buildId = path.join(webRoot, ".next", "BUILD_ID");
    if (!fs.existsSync(buildId)) {
      throw new Error(
        "local-web-runtime: production mode requires apps/web/.next/BUILD_ID; run the production/Cloudflare build first",
      );
    }
  }

  const apiStub = await startApiStub();

  const webNm = path.join(webRoot, "node_modules");
  let linkedNm = false;
  try {
    linkedNm = fs.lstatSync(webNm).isSymbolicLink();
  } catch {
    linkedNm = false;
  }
  const useWebpack = process.env.NEXT_DEV_WEBPACK === "1" || linkedNm;
  const nextArgs = productionMode
    ? [
        nextBin,
        "start",
        "--port",
        String(port),
        "--hostname",
        "127.0.0.1",
      ]
    : [
        nextBin,
        "dev",
        "--port",
        String(port),
        "--hostname",
        "127.0.0.1",
        ...(useWebpack ? ["--webpack"] : []),
      ];

  const child = spawn(process.execPath, nextArgs, {
    cwd: webRoot,
    env: {
      ...process.env,
      BROWSER: "none",
      NODE_ENV: productionMode ? "production" : "development",
      NODE_OPTIONS:
        process.env.NODE_OPTIONS || "--max-old-space-size=1536",
      PORT: String(port),
      ...(productionMode ? {} : { NEXT_DEV_SKIP_OPENNEXT: "1" }),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let output = "";
  const append = (buf) => {
    output += String(buf);
    if (output.length > 8000) output = output.slice(-4000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);

  const timeoutMs = Number(opts.timeoutMs) || 180000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      await closeServer(apiStub);
      throw new Error(
        `local-web-runtime: next exited ${child.exitCode}\n${output}`,
      );
    }
    if (await probe(baseUrl)) {
      return {
        baseUrl,
        started: true,
        stop: async () => {
          stopChild(child);
          await closeServer(apiStub);
        },
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  stopChild(child);
  await closeServer(apiStub);
  throw new Error(`local-web-runtime: timeout waiting for ${baseUrl}\n${output}`);
}

module.exports = {
  PRODUCTION_HOST_FRAGMENTS,
  assertSafeBaseUrl,
  ensureLocalWebRuntime,
};
