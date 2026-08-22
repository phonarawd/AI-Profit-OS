#!/usr/bin/env node
/**
 * Chrono24 HTTP-only live acquire proof.
 * fixture PASS를 live PASS로 위장하지 않음.
 * 이 환경에서 Cloudflare challenge면 exit 2.
 */

const { observeProduct } = require("./observe.cjs");

const CONFIRM_URL = "https://www.chrono24.com/rolex/index.htm";

async function main() {
  const report = {
    httpLive: "UNKNOWN",
    automatedAcquisition: "UNKNOWN",
    confirmation: null,
  };

  const confirmation = await observeProduct({
    source: "chrono24",
    url: "https://www.chrono24.com/rolex/submariner-date--id46423475.htm",
    purpose: "CONFIRMATION",
  });
  report.confirmation = {
    ok: confirmation.ok,
    sourceStatus: confirmation.sourceStatus,
    reason: confirmation.reason,
  };

  const discovery = await observeProduct({
    source: "chrono24",
    url: CONFIRM_URL,
    purpose: "DISCOVERY",
  });
  report.discovery = {
    ok: discovery.ok,
    sourceStatus: discovery.sourceStatus,
    reason: discovery.reason,
  };

  if (
    confirmation.sourceStatus === "ACCESS_BLOCKED" ||
    discovery.sourceStatus === "ACCESS_BLOCKED"
  ) {
    report.httpLive = "BLOCKED";
    report.automatedAcquisition = "BLOCKED_CURRENT_ENV";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  report.httpLive = "UNEXPECTED";
  report.automatedAcquisition = "UNEXPECTED";
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      httpLive: "BLOCKED",
      automatedAcquisition: "BLOCKED_CURRENT_ENV",
      error: String(err && err.message ? err.message : err),
    }),
  );
  process.exit(2);
});
