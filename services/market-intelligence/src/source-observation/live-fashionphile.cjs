#!/usr/bin/env node
/**
 * FASHIONPHILE live PUBLIC_JSON proof.
 * ACCESS_BLOCKED면 exit 2 · fixture PASS로 위장하지 않음.
 */

const { observeProduct } = require("./observe.cjs");
const { createMemoryRepository } = require("./repository.memory.cjs");

const CONFIRM_URL =
  "https://www.fashionphile.com/products/hermes-epsom-mini-kelly-sellier-20-black-1956054";
const DISCOVERY_URL = "https://www.fashionphile.com/products.json";

async function main() {
  const report = {
    httpLive: "UNKNOWN",
    discovery: null,
    confirmation: null,
    persistenceMemory: null,
  };

  const discovery = await observeProduct({
    source: "fashionphile",
    url: DISCOVERY_URL,
    purpose: "DISCOVERY",
    handle: "hermes-epsom-mini-kelly-sellier-20-black-1956054",
  });
  report.discovery = summarize(discovery);

  const confirmation = await observeProduct({
    source: "fashionphile",
    url: CONFIRM_URL,
    purpose: "CONFIRMATION",
  });
  report.confirmation = summarize(confirmation);

  if (discovery.sourceStatus === "ACCESS_BLOCKED" || confirmation.sourceStatus === "ACCESS_BLOCKED") {
    report.httpLive = "BLOCKED";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  if (!confirmation.ok || !confirmation.observation) {
    report.httpLive = "FAIL";
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.httpLive = "PASS";
  const repo = createMemoryRepository();
  repo.appendObservation(confirmation.observation);
  const readBack = repo.listObservations(
    confirmation.observation.source,
    confirmation.observation.externalItemId,
  );
  report.persistenceMemory =
    readBack.length === 1 && readBack[0].nativeAmount === confirmation.observation.nativeAmount
      ? "PASS"
      : "FAIL";

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.persistenceMemory === "PASS" ? 0 : 1);
}

function summarize(result) {
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
      observedAt: o.observedAt,
      parserVersion: o.parserVersion,
      priceKind: o.meta && o.meta.priceKind,
      acquisitionMode: result.acquisitionMode || "PUBLIC_JSON",
    };
  }
  if (result.candidates) {
    const firstOk = result.candidates.find((c) => c.ok && c.observation);
    return {
      ok: result.ok,
      kind: "catalog",
      candidateCount: result.candidates.length,
      sample: firstOk ? summarize({ ok: true, observation: firstOk.observation }) : result.candidates[0],
    };
  }
  return {
    ok: result.ok,
    sourceStatus: result.sourceStatus,
    reason: result.reason,
  };
}

main().catch((err) => {
  console.error(JSON.stringify({ httpLive: "BLOCKED", error: String(err && err.message ? err.message : err) }));
  process.exit(2);
});
