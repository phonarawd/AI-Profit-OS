/**
 * REL-022 — Auth WebAuthn RP SSOT.
 * Money §43.6 정책 재정의 0. RP는 Cloudflare APP_HOST / rootDomain 만 사용.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function loadDomainManifest() {
  const raw = fs.readFileSync(
    path.join(root, "infra/domain.manifest.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

function loadAuthWebauthnRp(manifest) {
  const man = manifest || loadDomainManifest();
  const appHost = String((man.env && man.env.APP_HOST) || "").trim();
  const rpId = String(man.rootDomain || "").trim();
  if (!appHost || !rpId) {
    throw new Error("domain.manifest missing APP_HOST or rootDomain");
  }
  return {
    rpId,
    appHost,
    origin: `https://${appHost}`,
    rpName: "퍼뜩",
  };
}

module.exports = {
  loadDomainManifest,
  loadAuthWebauthnRp,
};
