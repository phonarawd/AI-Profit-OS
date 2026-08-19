#!/usr/bin/env node
/**
 * Fashionphile ↔ eBay bounded overlap audit.
 * matcher 구현 전 실 pair 존재 여부만 조사. credential 값 출력 금지.
 */

const fs = require("fs");
const path = require("path");
const { observeProduct, discoverSourceItems } = require("../source-observation/observe.cjs");
const { credentialsFromEnv } = require("../source-observation/acquire/ebay-browse.cjs");
const { matchSourceObservations } = require("./matcher.cjs");

const root = path.resolve(__dirname, "../../../..");
const FASHIONPHILE_CONFIRM_URL =
  "https://www.fashionphile.com/products/hermes-epsom-mini-kelly-sellier-20-black-1956054";
const EBAY_LIMIT = 10;

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
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function sanitizeObservation(obs) {
  if (!obs) return null;
  const hints = (obs.meta && obs.meta.identityHints) || {};
  return {
    id: obs.id,
    source: obs.source,
    purpose: obs.observationPurpose,
    sourceStatus: obs.sourceStatus,
    externalItemId: obs.externalItemId,
    title: obs.title,
    brand: obs.meta && obs.meta.brand ? obs.meta.brand : null,
    model: obs.meta && obs.meta.model ? obs.meta.model : null,
    modelNumber: obs.meta && obs.meta.modelNumber ? obs.meta.modelNumber : null,
    sku: obs.meta && obs.meta.sku ? obs.meta.sku : null,
    size: obs.meta && obs.meta.size ? obs.meta.size : null,
    condition: obs.meta && obs.meta.condition ? obs.meta.condition : null,
    categoryHint: obs.meta && obs.meta.categoryHint ? obs.meta.categoryHint : null,
    gtin: hints.gtin || null,
    epid: hints.epid || null,
    inferredEpid: hints.inferredEpid || null,
    color: hints.color || null,
    nativeCurrency: obs.nativeCurrency || null,
    hasNativeAmount: Boolean(obs.nativeAmount),
    hasImage: Boolean(obs.imageUrl),
  };
}

function summarizeFailure(result) {
  return {
    ok: false,
    sourceStatus: result && result.sourceStatus ? result.sourceStatus : null,
    reason: result && result.reason ? result.reason : null,
  };
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const creds = credentialsFromEnv();
  const report = {
    REAL_OVERLAP_AUDIT: "UNKNOWN",
    REAL_CROSS_SOURCE_PAIR: "NOT_VERIFIED",
    credentialsConfigured: Boolean(creds.configured),
    fashionphile: null,
    ebayDiscovery: null,
    ebayConfirmations: [],
    matcherProof: null,
    overlap: {
      categoryOverlap: false,
      brandOverlap: false,
      modelOverlap: false,
      strongIdentifierOverlap: false,
      fashionphileIdentityOwners: [],
      notes: [],
    },
  };

  const fp = await observeProduct({
    source: "fashionphile",
    url: FASHIONPHILE_CONFIRM_URL,
    purpose: "CONFIRMATION",
  });
  if (!fp.ok || !fp.observation) {
    report.fashionphile = summarizeFailure(fp);
    report.REAL_OVERLAP_AUDIT =
      fp.sourceStatus === "ACCESS_BLOCKED" || fp.sourceStatus === "TEMPORARY_ERROR"
        ? "BLOCKED"
        : "FAIL";
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.REAL_OVERLAP_AUDIT === "FAIL" ? 1 : 2);
  }

  const fpObs = sanitizeObservation(fp.observation);
  report.fashionphile = fpObs;
  const owners = [];
  if (fpObs.brand) owners.push("brand");
  if (fpObs.sku) owners.push("sku_source_local");
  if (fpObs.title) owners.push("title_weak");
  report.overlap.fashionphileIdentityOwners = owners;
  report.overlap.notes.push(
    "fashionphile categoryHint/model/gtin/mpn absent on current parser output",
  );

  if (!creds.configured) {
    report.ebayDiscovery = { ok: false, reason: "BLOCKED_CREDENTIALS" };
    report.REAL_OVERLAP_AUDIT = "PASS";
    report.REAL_CROSS_SOURCE_PAIR = "BLOCKED_NO_REAL_PAIR";
    report.overlap.notes.push("ebay credentials missing — pair search skipped");
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const query = [fpObs.brand, fpObs.title].filter(Boolean).join(" ").trim() || "Hermes Mini Kelly";
  const discovery = await discoverSourceItems({
    source: "ebay",
    query,
    limit: EBAY_LIMIT,
    marketplaceId: "EBAY_US",
  });
  if (!discovery.ok) {
    report.ebayDiscovery = summarizeFailure(discovery);
    report.REAL_OVERLAP_AUDIT =
      discovery.reason === "BLOCKED_CREDENTIALS" ||
      discovery.sourceStatus === "ACCESS_BLOCKED" ||
      discovery.sourceStatus === "TEMPORARY_ERROR"
        ? "BLOCKED"
        : "FAIL";
    report.REAL_CROSS_SOURCE_PAIR = "BLOCKED_NO_REAL_PAIR";
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.REAL_OVERLAP_AUDIT === "FAIL" ? 1 : 2);
  }

  const successes = (discovery.candidates || []).filter((row) => row.ok && row.observation);
  report.ebayDiscovery = {
    ok: true,
    queryUsed: query,
    limit: EBAY_LIMIT,
    candidateCount: successes.length,
    samples: successes.slice(0, EBAY_LIMIT).map((row) => sanitizeObservation(row.observation)),
  };

  const confirmedObservations = [];
  for (const row of successes.slice(0, 3)) {
    const confirmation = await observeProduct({
      source: "ebay",
      externalItemId: row.observation.externalItemId,
      purpose: "CONFIRMATION",
      marketplaceId: "EBAY_US",
    });
    if (confirmation.ok && confirmation.observation) {
      confirmedObservations.push(confirmation.observation);
      report.ebayConfirmations.push(sanitizeObservation(confirmation.observation));
    } else {
      report.ebayConfirmations.push(summarizeFailure(confirmation));
    }
  }

  const ebayRows = report.ebayConfirmations.filter((row) => row && row.source === "ebay");
  const fpBrand = String(fpObs.brand || "").trim().toLowerCase();
  for (const ebay of ebayRows) {
    const ebayBrand = String(ebay.brand || "").trim().toLowerCase();
    if (fpBrand && ebayBrand && fpBrand === ebayBrand) report.overlap.brandOverlap = true;
    if (fpObs.model && ebay.model && fpObs.model === ebay.model) report.overlap.modelOverlap = true;
    if (fpObs.gtin && ebay.gtin && fpObs.gtin === ebay.gtin) {
      report.overlap.strongIdentifierOverlap = true;
    }
  }
  report.overlap.notes.push(
    "fashionphile sku is source-local — not compared as GTIN/MPN",
  );
  report.overlap.notes.push(
    "profile cannot be inferred from source name fashionphile",
  );

  const hasStrongPair = report.overlap.strongIdentifierOverlap;
  report.REAL_OVERLAP_AUDIT = "PASS";
  report.REAL_CROSS_SOURCE_PAIR = hasStrongPair ? "PASS" : "BLOCKED_NO_REAL_PAIR";

  if (fp.observation && confirmedObservations[0]) {
    const judged = matchSourceObservations(fp.observation, confirmedObservations[0], {
      now: "2026-08-19T12:00:00.000Z",
    });
    report.matcherProof = {
      leftSource: judged.leftSource,
      rightSource: judged.rightSource,
      decision: judged.decision,
      identityProfile: judged.identityProfile,
      matchingDecisionEligible: judged.matchingDecisionEligible,
      matcherVersion: judged.matcherVersion,
      matchedFields: judged.matchedEvidence.map((row) => row.field),
      conflictingFields: judged.conflictingEvidence.map((row) => row.field),
      missingFields: judged.missingEvidence.map((row) => row.field),
    };
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      REAL_OVERLAP_AUDIT: "BLOCKED",
      error: String(err && err.message ? err.message : err),
    }),
  );
  process.exit(2);
});
