#!/usr/bin/env node
/**
 * Local four-eye allowlist for Tatum KMS (127.0.0.1 only).
 * GET /:txId → 200 if allowlisted, else 404 (KMS skips signing).
 * Never prints secrets. Not exposed publicly.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.AIPO_KMS_FOUR_EYE_PORT || 17999);
const HOME =
  process.env.AIPO_TRON_KMS_HOME ||
  path.join(os.homedir(), "AppData", "Local", "AI-Profit-OS", "tatum-kms");
const ALLOW = path.join(HOME, "four-eye-allowlist.json");

function loadAllow() {
  try {
    if (!fs.existsSync(ALLOW)) return new Set();
    const j = JSON.parse(fs.readFileSync(ALLOW, "utf8"));
    const ids = Array.isArray(j.ids) ? j.ids : [];
    return new Set(ids.map(String));
  } catch {
    return new Set();
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end();
    return;
  }
  const id = decodeURIComponent((req.url || "/").replace(/^\//, "").split("?")[0]);
  if (!id || id === "health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  const ok = loadAllow().has(id);
  res.writeHead(ok ? 200 : 404, { "Content-Type": "text/plain" });
  res.end(ok ? "ok" : "deny");
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`four-eye listening 127.0.0.1:${PORT}\n`);
});
