/**
 * REL-023 Day-1 certification — backend slice only.
 * Customer-web install/offline/badge/UX items live in putduk-web
 * (quality/putduk-web-ui-assertions-handoff.md).
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function runDay1CertCases() {
  assertQaIsolation({ purpose: "qa", host: "localhost" });

  const kill = read("workers/push-dispatcher/src/lib/dispatch.cjs");
  const items = {
    kill: kill.includes('status: "killed"') && kill.includes("sendAttempted: false"),
    webauthn_rp: exists("governance/pwa/webauthn-rp.v1.json"),
    push_channel: exists("governance/pwa/push-channel-filter.v1.json"),
    push_kill: exists("governance/pwa/push-kill.v1.json"),
  };

  return {
    items,
    storeBridge: 0,
    post017: 0,
    storeBridgeLeak: false,
  };
}

module.exports = { runDay1CertCases };
