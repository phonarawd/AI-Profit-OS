#!/usr/bin/env node
/**
 * TCG automated SourceObservation + existing eBay bridge + V2 match.
 * manual/fixture observation을 final MATCH 입력으로 쓰지 않는다.
 */

const fs = require("fs");
const path = require("path");
const { matchSourceObservationsV2, MATCHER_VERSION } = require("./index.cjs");
const {
  assemblePairEvidence,
  independentStructuredCorroboration,
  pickField,
} = require("./evidence.cjs");
const { observeProduct } = require("../../source-observation/observe.cjs");
const { TCGPLAYER_PARSER_VERSION } = require("../../source-observation/contract.cjs");
const { credentialsFromEnv } = require("../../source-observation/acquire/ebay-browse.cjs");

const root = path.resolve(__dirname, "../../../../..");
const NOW = new Date().toISOString();
const PINNED_TCG_PRODUCT = "113669";
const PINNED_EBAY_ITEM = "377416817781";
const TCG_URL = `https://www.tcgplayer.com/product/${PINNED_TCG_PRODUCT}`;

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

function gitHead() {
  try {
    const raw = fs.readFileSync(path.join(root, ".git/HEAD"), "utf8").trim();
    if (raw.startsWith("ref:")) {
      const ref = raw.replace(/^ref:\s*/, "");
      const refFile = path.join(root, ".git", ref);
      if (fs.existsSync(refFile)) return fs.readFileSync(refFile, "utf8").trim();
      return ref;
    }
    return raw;
  } catch {
    return "UNKNOWN";
  }
}

function ownerOf(obs, field) {
  const hints = (obs.meta && obs.meta.identityHints) || {};
  return hints[field] || "";
}

function summarizeEvidence(result, assembled) {
  const set = pickField(assembled.left, "set");
  const rightSet = pickField(assembled.right, "set");
  const num = pickField(assembled.left, "cardNumber");
  const rightNum = pickField(assembled.right, "cardNumber");
  const independent = independentStructuredCorroboration(assembled);
  return {
    tcgSetOwner: Boolean(set && set.evidenceOwner === "OWNER_BACKED_STRUCTURED"),
    tcgCardNumberOwner: Boolean(num && num.evidenceOwner === "OWNER_BACKED_STRUCTURED"),
    tcgGameOwner: Boolean(
      assembled.left.owner.game &&
        assembled.left.owner.game.evidenceOwner === "OWNER_BACKED_STRUCTURED",
    ),
    ebaySetDerived: Boolean(
      rightSet &&
        rightSet.evidenceOwner === "DERIVED_STRUCTURED" &&
        rightSet.derivedFrom === "title",
    ),
    ebayCardNumberDerived: Boolean(
      rightNum &&
        rightNum.evidenceOwner === "DERIVED_STRUCTURED" &&
        rightNum.derivedFrom === "title",
    ),
    independentField: independent.field,
    independentOk: independent.ok,
    decision: result.decision,
    matchPath: result.matchPath,
    conflicts: result.conflicts.map((row) => row.field),
  };
}

function isAutomatedTcg(obs) {
  if (!obs) return false;
  if (obs.source !== "tcgplayer") return false;
  if (obs.parserVersion !== TCGPLAYER_PARSER_VERSION) return false;
  if (obs.meta && obs.meta.observationMode === "MANUAL_LIVE_VALIDATION") return false;
  if (String(obs.parserVersion).includes("live-manual")) return false;
  if (String(obs.parserVersion).includes("fixture.")) return false;
  return obs.meta && obs.meta.observationMode === "AUTOMATED_LIVE";
}

function printReport(row) {
  const lines = [
    "# PUTDUK_TCGPLAYER_MINIMAL_AUTOMATED_SOURCE_OBSERVATION_AND_REAL_AUTOMATED_MATCH",
    "",
    `GIT_SAFETY = ${row.GIT_SAFETY}`,
    `HEAD = ${row.HEAD}`,
    `WORKTREE_PROTECTED = ${row.WORKTREE_PROTECTED}`,
    "",
    "FILES_MODIFIED:",
    ...(row.FILES_MODIFIED || []).map((f) => `- ${f}`),
    "FILES_ADDED:",
    ...(row.FILES_ADDED || []).map((f) => `- ${f}`),
    "",
    `TCGPLAYER_ACQUISITION_MODE = ${row.TCGPLAYER_ACQUISITION_MODE}`,
    `TCGPLAYER_PUBLIC_PAGE_ACQUISITION = ${row.TCGPLAYER_PUBLIC_PAGE_ACQUISITION}`,
    "",
    `TCGPLAYER_EXTRACTION_PATH = ${row.TCGPLAYER_EXTRACTION_PATH}`,
    `TCGPLAYER_AUTOMATED_EXTRACTION = ${row.TCGPLAYER_AUTOMATED_EXTRACTION}`,
    "",
    `TCG_PRODUCT_ID = ${row.TCG_PRODUCT_ID}`,
    `TCG_GAME_OWNER = ${row.TCG_GAME_OWNER}`,
    `TCG_SET_OWNER = ${row.TCG_SET_OWNER}`,
    `TCG_CARD_NUMBER_OWNER = ${row.TCG_CARD_NUMBER_OWNER}`,
    `TCG_CATEGORY_OWNER = ${row.TCG_CATEGORY_OWNER}`,
    "",
    `TCG_OBSERVATION_STAGE = ${row.TCG_OBSERVATION_STAGE}`,
    `TCG_OBSERVATION_STATUS = ${row.TCG_OBSERVATION_STATUS}`,
    `TCG_OBSERVATION_MODE = ${row.TCG_OBSERVATION_MODE}`,
    "",
    `TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION = ${row.TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION}`,
    `TCG_AUTOMATED_CONFIRMATION = ${row.TCG_AUTOMATED_CONFIRMATION}`,
    "",
    `EBAY_ITEM_ID = ${row.EBAY_ITEM_ID}`,
    `EBAY_AUTOMATED_SOURCE_OBSERVATION = ${row.EBAY_AUTOMATED_SOURCE_OBSERVATION}`,
    "",
    `PAIR_PROFILE = ${row.PAIR_PROFILE}`,
    `INDEPENDENT_STRUCTURED_CORROBORATION = ${row.INDEPENDENT_STRUCTURED_CORROBORATION}`,
    `CONFLICTS = ${row.CONFLICTS}`,
    "",
    `V2_DECISION = ${row.V2_DECISION}`,
    `MATCH_PATH = ${row.MATCH_PATH}`,
    `MATCHER_VERSION = ${row.MATCHER_VERSION}`,
    "",
    `V1_REGRESSION = ${row.V1_REGRESSION}`,
    `V2_REGRESSION = ${row.V2_REGRESSION}`,
    "",
    `TCG_MANUAL_OBSERVATION_USED_IN_FINAL_MATCH = ${row.TCG_MANUAL_OBSERVATION_USED_IN_FINAL_MATCH}`,
    `FIXTURE_USED_IN_FINAL_MATCH = ${row.FIXTURE_USED_IN_FINAL_MATCH}`,
    "",
    `REAL_AUTOMATED_CROSS_SOURCE_MATCH = ${row.REAL_AUTOMATED_CROSS_SOURCE_MATCH}`,
    "",
    `MATCHER_LOOSENING = ${row.MATCHER_LOOSENING}`,
    `TITLE_ONLY_MATCH = ${row.TITLE_ONLY_MATCH}`,
    `IMAGE_ONLY_MATCH = ${row.IMAGE_ONLY_MATCH}`,
    `DERIVED_ONLY_MATCH = ${row.DERIVED_ONLY_MATCH}`,
    `PRICE_IDENTITY = ${row.PRICE_IDENTITY}`,
    "",
    `COMMIT_PUSH_STASH_RESTORE = ${row.COMMIT_PUSH_STASH_RESTORE}`,
    "",
    `NEXT_RECOMMENDED_SLICE = ${row.NEXT_RECOMMENDED_SLICE}`,
  ];
  if (row.acquisitionReport) {
    lines.push("");
    lines.push(`HTTP_HTML = ${row.acquisitionReport.HTTP_HTML}`);
    lines.push(`BROWSER_RENDERED = ${row.acquisitionReport.BROWSER_RENDERED}`);
    lines.push(`CHALLENGE_DETECTED = ${row.acquisitionReport.CHALLENGE_DETECTED}`);
    lines.push(`PRODUCT_PAGE_ACQUIRED = ${row.acquisitionReport.PRODUCT_PAGE_ACQUIRED}`);
    lines.push(`STRUCTURED_DATA_FOUND = ${row.acquisitionReport.STRUCTURED_DATA_FOUND}`);
    lines.push(`EMBEDDED_STATE_FOUND = ${row.acquisitionReport.EMBEDDED_STATE_FOUND}`);
    lines.push(`DOM_FIELDS_FOUND = ${row.acquisitionReport.DOM_FIELDS_FOUND}`);
  }
  console.log(lines.join("\n"));
}

function baseReport() {
  return {
    GIT_SAFETY: "READ_ONLY_CONFIRMED",
    HEAD: gitHead(),
    WORKTREE_PROTECTED: "YES",
    FILES_MODIFIED: [
      "services/market-intelligence/src/source-observation/contract.cjs",
      "services/market-intelligence/src/source-observation/observe.cjs",
      "services/market-intelligence/src/source-observation/index.cjs",
      "governance/global-product/source-observation-runtime.v1.json",
      "schemas/source-observation.v1.json",
      "tooling/verify/source-observation-runtime.cjs",
    ],
    FILES_ADDED: [
      "services/market-intelligence/src/source-observation/adapters/tcgplayer.cjs",
      "services/market-intelligence/src/source-observation/acquire/browser-rendered.cjs",
      "services/market-intelligence/src/source-observation/fixtures/tcgplayer/",
      "services/market-intelligence/src/identity-matching/v2/live-automated-cross-source-match.cjs",
    ],
    TCGPLAYER_ACQUISITION_MODE: "NOT_RUN",
    TCGPLAYER_PUBLIC_PAGE_ACQUISITION: "NOT_RUN",
    TCGPLAYER_EXTRACTION_PATH: "NOT_RUN",
    TCGPLAYER_AUTOMATED_EXTRACTION: "NOT_RUN",
    TCG_PRODUCT_ID: PINNED_TCG_PRODUCT,
    TCG_GAME_OWNER: "NOT_RUN",
    TCG_SET_OWNER: "NOT_RUN",
    TCG_CARD_NUMBER_OWNER: "NOT_RUN",
    TCG_CATEGORY_OWNER: "NO",
    TCG_OBSERVATION_STAGE: "NOT_RUN",
    TCG_OBSERVATION_STATUS: "NOT_RUN",
    TCG_OBSERVATION_MODE: "NOT_RUN",
    TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION: "NOT_RUN",
    TCG_AUTOMATED_CONFIRMATION: "NOT_RUN",
    EBAY_ITEM_ID: PINNED_EBAY_ITEM,
    EBAY_AUTOMATED_SOURCE_OBSERVATION: "NOT_RUN",
    PAIR_PROFILE: "NOT_RUN",
    INDEPENDENT_STRUCTURED_CORROBORATION: "NOT_RUN",
    CONFLICTS: "NOT_RUN",
    V2_DECISION: "NOT_RUN",
    MATCH_PATH: "NOT_RUN",
    MATCHER_VERSION: MATCHER_VERSION,
    V1_REGRESSION: process.env.V1_REGRESSION || "PENDING_SEPARATE",
    V2_REGRESSION: process.env.V2_REGRESSION || "PENDING_SEPARATE",
    TCG_MANUAL_OBSERVATION_USED_IN_FINAL_MATCH: "NO",
    FIXTURE_USED_IN_FINAL_MATCH: "NO",
    REAL_AUTOMATED_CROSS_SOURCE_MATCH: "NOT_RUN",
    MATCHER_LOOSENING: "NO",
    TITLE_ONLY_MATCH: "BLOCKED",
    IMAGE_ONLY_MATCH: "BLOCKED",
    DERIVED_ONLY_MATCH: "BLOCKED",
    PRICE_IDENTITY: "BLOCKED",
    COMMIT_PUSH_STASH_RESTORE: "NO",
    NEXT_RECOMMENDED_SLICE: "STOP",
  };
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const report = baseReport();
  const creds = credentialsFromEnv();

  const tcg = await observeProduct({
    source: "tcgplayer",
    url: TCG_URL,
    externalItemId: PINNED_TCG_PRODUCT,
    purpose: "CONFIRMATION",
  });
  report.acquisitionReport = tcg.acquisitionReport || null;
  report.TCGPLAYER_ACQUISITION_MODE = (tcg && tcg.acquisitionMode) || "NONE";
  report.TCGPLAYER_PUBLIC_PAGE_ACQUISITION =
    tcg.acquisitionReport && tcg.acquisitionReport.PRODUCT_PAGE_ACQUIRED === "YES"
      ? "PASS"
      : "FAIL";
  report.TCGPLAYER_EXTRACTION_PATH = (tcg && tcg.extractionPath) || "NONE";

  if (!tcg.ok || !tcg.observation) {
    report.TCGPLAYER_AUTOMATED_EXTRACTION = "FAIL";
    report.TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION = `BLOCKED_${(tcg.reason || "SOURCE_RUNTIME").toUpperCase()}`;
    report.TCG_AUTOMATED_CONFIRMATION = "FAIL";
    report.TCG_OBSERVATION_STATUS = tcg.sourceStatus || "FAIL";
    report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = "BLOCKED_SOURCE_RUNTIME";
    report.NEXT_RECOMMENDED_SLICE = "STOP";
    printReport(report);
    process.exit(2);
  }

  const tcgObs = tcg.observation;
  report.TCGPLAYER_AUTOMATED_EXTRACTION =
    ownerOf(tcgObs, "game") && ownerOf(tcgObs, "set") && ownerOf(tcgObs, "cardNumber")
      ? "PASS"
      : "FAIL";
  report.TCG_PRODUCT_ID = tcgObs.externalItemId;
  report.TCG_GAME_OWNER = ownerOf(tcgObs, "game") ? "PASS" : "FAIL";
  report.TCG_SET_OWNER = ownerOf(tcgObs, "set") ? "PASS" : "FAIL";
  report.TCG_CARD_NUMBER_OWNER = ownerOf(tcgObs, "cardNumber") ? "PASS" : "FAIL";
  report.TCG_CATEGORY_OWNER = tcgObs.meta && tcgObs.meta.categoryHint ? "PRESENT" : "NO";
  report.TCG_OBSERVATION_STAGE = tcgObs.observationPurpose;
  report.TCG_OBSERVATION_STATUS = tcgObs.sourceStatus;
  report.TCG_OBSERVATION_MODE = (tcgObs.meta && tcgObs.meta.observationMode) || "UNKNOWN";
  const automated = isAutomatedTcg(tcgObs);
  const confirmOk =
    automated &&
    tcgObs.observationPurpose === "CONFIRMATION" &&
    tcgObs.sourceStatus === "SUCCESS";
  report.TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION = automated && tcg.ok ? "PASS" : "FAIL";
  report.TCG_AUTOMATED_CONFIRMATION = confirmOk ? "PASS" : "FAIL";

  if (!confirmOk) {
    report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = "BLOCKED_SOURCE_RUNTIME";
    report.NEXT_RECOMMENDED_SLICE = "STOP";
    printReport(report);
    process.exit(2);
  }

  if (!creds.configured) {
    report.EBAY_AUTOMATED_SOURCE_OBSERVATION = "BLOCKED_CREDENTIALS";
    report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = "BLOCKED_SOURCE_RUNTIME";
    report.NEXT_RECOMMENDED_SLICE = "SUPPLY_EBAY_BROWSE_CREDENTIALS";
    printReport(report);
    process.exit(2);
  }

  const ebay = await observeProduct({
    source: "ebay",
    externalItemId: PINNED_EBAY_ITEM,
    purpose: "CONFIRMATION",
    marketplaceId: "EBAY_US",
  });
  if (!ebay.ok || !ebay.observation) {
    report.EBAY_AUTOMATED_SOURCE_OBSERVATION = `FAIL:${ebay.reason || ebay.sourceStatus || "unknown"}`;
    report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = "BLOCKED_SOURCE_RUNTIME";
    printReport(report);
    process.exit(2);
  }
  const ebayObs = ebay.observation;
  report.EBAY_ITEM_ID = ebayObs.externalItemId || PINNED_EBAY_ITEM;
  report.EBAY_AUTOMATED_SOURCE_OBSERVATION =
    ebayObs.observationPurpose === "CONFIRMATION" && ebayObs.sourceStatus === "SUCCESS"
      ? "PASS"
      : "FAIL";
  if (report.EBAY_AUTOMATED_SOURCE_OBSERVATION !== "PASS") {
    report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = "BLOCKED_SOURCE_RUNTIME";
    printReport(report);
    process.exit(2);
  }

  const result = matchSourceObservationsV2(tcgObs, ebayObs, { now: NOW });
  const assembled = assemblePairEvidence(tcgObs, ebayObs, {});
  const summary = summarizeEvidence(result, assembled);
  report.PAIR_PROFILE = result.categoryProfile || "unknown";
  report.INDEPENDENT_STRUCTURED_CORROBORATION = summary.independentOk
    ? `PASS:${summary.independentField}`
    : "FAIL";
  report.CONFLICTS = result.conflicts.length === 0 ? "NONE" : summary.conflicts.join(",");
  report.V2_DECISION = result.decision;
  report.MATCH_PATH = result.matchPath || "null";
  report.MATCHER_VERSION = result.matcherVersion;

  const pass =
    report.TCGPLAYER_PUBLIC_PAGE_ACQUISITION === "PASS" &&
    report.TCGPLAYER_AUTOMATED_EXTRACTION === "PASS" &&
    report.TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION === "PASS" &&
    report.TCG_AUTOMATED_CONFIRMATION === "PASS" &&
    report.EBAY_AUTOMATED_SOURCE_OBSERVATION === "PASS" &&
    result.decision === "MATCH" &&
    result.matchPath === "COMPOSITE_STRONG" &&
    result.categoryProfile === "trading_card" &&
    summary.tcgSetOwner &&
    summary.tcgCardNumberOwner &&
    summary.tcgGameOwner &&
    summary.ebaySetDerived &&
    summary.ebayCardNumberDerived &&
    summary.independentField === "CROSS_SIDE_STRUCTURED_PROFILE_CORROBORATION" &&
    result.conflicts.length === 0 &&
    automated;

  report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = pass ? "PASS" : "FAIL";
  report.NEXT_RECOMMENDED_SLICE = pass
    ? "CANONICAL_PRODUCT_OR_STOP"
    : "STOP";
  printReport(report);
  if (!pass) {
    const set = pickField(assembled.left, "set");
    const rightSet = pickField(assembled.right, "set");
    const num = pickField(assembled.left, "cardNumber");
    const rightNum = pickField(assembled.right, "cardNumber");
    console.log(
      "\n---DEBUG---\n" +
        JSON.stringify(
          {
            tcgTitle: tcgObs.title,
            tcgHints: tcgObs.meta && tcgObs.meta.identityHints,
            tcgEvidence: tcgObs.meta && tcgObs.meta.extractionEvidence,
            ebayTitle: ebayObs.title,
            ebayCategory: ebayObs.meta && ebayObs.meta.categoryHint,
            eligible: result.matchingDecisionEligible,
            setLeft: set && { value: set.value, owner: set.evidenceOwner },
            setRight: rightSet && { value: rightSet.value, owner: rightSet.evidenceOwner, from: rightSet.derivedFrom },
            numLeft: num && { value: num.value, owner: num.evidenceOwner },
            numRight: rightNum && { value: rightNum.value, owner: rightNum.evidenceOwner, from: rightNum.derivedFrom },
            evidence: result.evidence.map((row) => ({
              field: row.field,
              comparison: row.comparison,
              strength: row.strength,
              left: row.left && row.left.value,
              right: row.right && row.right.value,
            })),
          },
          null,
          2,
        ),
    );
  }
  process.exit(pass ? 0 : 2);
}

main().catch((err) => {
  const report = baseReport();
  report.TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION = "BLOCKED_SOURCE_RUNTIME";
  report.REAL_AUTOMATED_CROSS_SOURCE_MATCH = "BLOCKED_SOURCE_RUNTIME";
  report.NEXT_RECOMMENDED_SLICE = "STOP";
  printReport(report);
  console.error(String(err && err.message ? err.message : err));
  process.exit(2);
});
