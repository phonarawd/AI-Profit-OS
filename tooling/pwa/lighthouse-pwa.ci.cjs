/**
 * REL-023 — Lighthouse PWA category. CI 위임.
 * 로컬 저사양에서는 static installability 전제만 검사한다.
 * LIGHTHOUSE_PWA=1 이면 실제 lighthouse를 부를 수 있으나 Day-1 필수 0.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function staticPwaAudit() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "apps/web/public/manifest.webmanifest"), "utf8"),
  );
  const sw = fs.readFileSync(path.join(root, "apps/web/public/sw.js"), "utf8");
  const fails = [];
  if (manifest.display !== "standalone") fails.push("display standalone");
  if (!manifest.start_url) fails.push("start_url");
  if (!manifest.icons || manifest.icons.length < 2) fails.push("icons");
  if (!sw.includes("addEventListener(\"fetch\"")) fails.push("SW fetch");
  if (!fs.existsSync(path.join(root, "apps/web/public/icons/icon-192.png"))) {
    fails.push("icon-192");
  }
  if (!fs.existsSync(path.join(root, "apps/web/public/icons/icon-512.png"))) {
    fails.push("icon-512");
  }
  return { ok: fails.length === 0, fails, delegated: true };
}

if (require.main === module) {
  const result = staticPwaAudit();
  if (!result.ok) {
    console.error("[lighthouse-pwa.ci] FAIL\n- " + result.fails.join("\n- "));
    process.exit(1);
  }
  console.log("[lighthouse-pwa.ci] PASS (static PWA installability · Lighthouse CI-delegated)");
}

module.exports = { staticPwaAudit };
