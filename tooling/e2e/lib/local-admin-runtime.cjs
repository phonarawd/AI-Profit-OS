/**
 * 로컬 Admin Next 런타임. production host fallback 0.
 */
"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");

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
    throw new Error("local-admin-runtime: production host denied");
  }
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error(`local-admin-runtime: loopback only (got ${host})`);
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
        reject(new Error("local-admin-runtime: no free port"));
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

function resolveNextBin() {
  const adminRoot = path.join(ROOT, "apps/admin");
  const candidates = [
    path.join(adminRoot, "node_modules/next/dist/bin/next"),
    path.join(ROOT, "node_modules/next/dist/bin/next"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function ensureLocalAdminRuntime(opts = {}) {
  const existing = process.env.PLAYWRIGHT_ADMIN_BASE_URL;
  if (existing) {
    const baseUrl = assertSafeBaseUrl(existing);
    const ok = await probe(baseUrl);
    if (!ok) {
      throw new Error("local-admin-runtime: PLAYWRIGHT_ADMIN_BASE_URL not reachable");
    }
    return { baseUrl, started: false, stop: async () => {} };
  }

  const port = await findFreePort(Number(opts.port) || 3010);
  const baseUrl = `http://127.0.0.1:${port}`;
  const adminRoot = path.join(ROOT, "apps/admin");
  const nextBin = resolveNextBin();
  if (!nextBin) {
    throw new Error("local-admin-runtime: next binary missing");
  }
  const args = [nextBin, "dev", "--port", String(port), "--hostname", "127.0.0.1"];
  if (process.env.ADMIN_NEXT_WEBPACK === "1") args.push("--webpack");
  const child = spawn(process.execPath, args, {
    cwd: adminRoot,
    env: {
      ...process.env,
      BROWSER: "none",
      NODE_ENV: "development",
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
      PORT: String(port),
      NEXT_DEV_SKIP_OPENNEXT: "1",
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
      throw new Error(
        `local-admin-runtime: next exited ${child.exitCode}\n${output}`,
      );
    }
    if (await probe(baseUrl)) {
      return {
        baseUrl,
        started: true,
        stop: async () => {
          stopChild(child);
        },
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  stopChild(child);
  throw new Error(`local-admin-runtime: timeout waiting for ${baseUrl}\n${output}`);
}

module.exports = {
  PRODUCTION_HOST_FRAGMENTS,
  assertSafeBaseUrl,
  ensureLocalAdminRuntime,
};
