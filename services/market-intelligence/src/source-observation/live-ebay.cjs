#!/usr/bin/env node
/**
 * eBay Browse API live proof.
 * credential 값 출력 금지. fixture PASS를 live PASS로 위장하지 않음.
 * Discovery limit 5 · Confirmation 최대 3.
 */

const fs = require("fs");
const path = require("path");
const { observeProduct, discoverSourceItems } = require("./observe.cjs");
const { credentialsFromEnv } = require("./acquire/ebay-browse.cjs");
const { createMemoryRepository } = require("./repository.memory.cjs");

const root = path.resolve(__dirname, "../../../..");

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    if (process.env[key]) continue;
    let value = line.slice(i + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function summarizeObservation(result) {
  if (!result) return null;
  if (result.observation) {
    const o = result.observation;
    return {
      ok: result.ok,
      sourceStatus: o.sourceStatus,
      purpose: o.observationPurpose,
      externalItemId: o.externalItemId,
      title: o.title,
      nativeAmount: o.nativeAmount ?? null,
      nativeCurrency: o.nativeCurrency ?? null,
      imageUrl: o.imageUrl,
      priceSemantics: o.meta && o.meta.priceSemantics,
      acquisitionMode: result.acquisitionMode || "API",
    };
  }
  return {
    ok: result.ok,
    sourceStatus: result.sourceStatus || null,
    reason: result.reason || null,
    candidateCount: Array.isArray(result.candidates) ? result.candidates.length : undefined,
  };
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const creds = credentialsFromEnv();
  const report = {
    httpLive: "UNKNOWN",
    credentialsConfigured: creds.configured,
    discovery: null,
    confirmation: null,
    persistenceMemory: null,
  };

  if (!creds.configured) {
    report.httpLive = "BLOCKED_CREDENTIALS";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const query = process.env.EBAY_OBSERVATION_LIVE_QUERY || "watch";
  const discovery = await discoverSourceItems({
    source: "ebay",
    query,
    limit: 5,
    marketplaceId: "EBAY_US",
  });
  report.discovery = summarizeObservation(discovery);
  if (discovery.reason === "BLOCKED_CREDENTIALS") {
    report.httpLive = "BLOCKED_CREDENTIALS";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  if (!discovery.ok) {
    if (discovery.sourceStatus === "TEMPORARY_ERROR" || discovery.sourceStatus === "ACCESS_BLOCKED") {
      report.httpLive = "BLOCKED";
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    report.httpLive = "FAIL";
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const successes = (discovery.candidates || []).filter((row) => row.ok && row.observation);
  if (successes.length === 0) {
    report.httpLive = "FAIL";
    report.discovery.empty = true;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let confirmation = null;
  for (const row of successes.slice(0, 3)) {
    confirmation = await observeProduct({
      source: "ebay",
      externalItemId: row.observation.externalItemId,
      purpose: "CONFIRMATION",
      marketplaceId: "EBAY_US",
    });
    if (confirmation.ok && confirmation.observation) break;
  }
  report.confirmation = summarizeObservation(confirmation);

  if (!confirmation || !confirmation.ok || !confirmation.observation) {
    if (confirmation && (confirmation.sourceStatus === "TEMPORARY_ERROR" || confirmation.reason === "BLOCKED_CREDENTIALS")) {
      report.httpLive = confirmation.reason === "BLOCKED_CREDENTIALS" ? "BLOCKED_CREDENTIALS" : "BLOCKED";
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    report.httpLive = "FAIL";
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const repo = createMemoryRepository();
  repo.appendObservation(confirmation.observation);
  const readBack = repo.listObservations(
    confirmation.observation.source,
    confirmation.observation.externalItemId,
  );
  report.persistenceMemory =
    readBack.length === 1 && readBack[0].externalItemId === confirmation.observation.externalItemId
      ? "PASS"
      : "FAIL";
  report.httpLive = report.persistenceMemory === "PASS" ? "PASS" : "FAIL";
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.httpLive === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
