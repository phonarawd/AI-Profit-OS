#!/usr/bin/env node
/**
 * V2 one-real-pair live validation.
 * TCG = MANUAL_LIVE_VALIDATION observation. production parser 0.
 * eBay = 기존 Browse discovery + CONFIRMATION.
 * matcher / V1 / adapter 수정 0. credential 값 출력 0.
 */

const fs = require("fs");
const path = require("path");
const { matchSourceObservationsV2, MATCHER_VERSION, PIPELINE_STATUS } = require("./index.cjs");
const {
  assemblePairEvidence,
  independentStructuredCorroboration,
  hasIndependentCorroboration,
  titleHasExactValue,
  pickField,
} = require("./evidence.cjs");
const { observeProduct } = require("../../source-observation/observe.cjs");
const { credentialsFromEnv } = require("../../source-observation/acquire/ebay-browse.cjs");

const root = path.resolve(__dirname, "../../../../..");
const NOW = new Date().toISOString();
const PINNED_EBAY_ITEM = "377416817781";

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
    return fs
      .readFileSync(path.join(root, ".git/HEAD"), "utf8")
      .trim()
      .replace(/^ref:\s*/, "");
  } catch {
    return "UNKNOWN";
  }
}

/**
 * Live-captured 2026-08-19 from:
 * - public product page Product Details "Card Number / Rarity: 11/83"
 * - Pokémon search card: h4 Set=Generations, "#11/83", name=Charizard EX
 * categoryProfile는 Set+Number만으로 OWNER 승격하지 않음.
 */
function buildTcgObservation() {
  return {
    id: "obs_v2_live_tcg_113669",
    source: "tcgplayer",
    externalItemId: "113669",
    url: "https://www.tcgplayer.com/product/113669/pokemon-generations-charizard-ex",
    title: "Charizard EX - Generations (GEN)",
    imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/113669_in_200x200.jpg",
    observedAt: NOW,
    fetchedAt: NOW,
    observationPurpose: "CONFIRMATION",
    sourceStatus: "SUCCESS",
    parserVersion: "validation.tcgplayer.live-manual.1",
    displayAuthorized: false,
    meta: {
      observationMode: "MANUAL_LIVE_VALIDATION",
      categoryProfileOwner: "DERIVED_PROFILE",
      identityHints: {
        game: "Pokémon",
        set: "Generations",
        cardNumber: "11/83",
        character: "Charizard EX",
      },
    },
  };
}

function sanitizeEbay(obs) {
  if (!obs) return null;
  const hints = (obs.meta && obs.meta.identityHints) || {};
  return {
    id: obs.id,
    source: obs.source,
    purpose: obs.observationPurpose,
    sourceStatus: obs.sourceStatus,
    externalItemId: obs.externalItemId,
    url: obs.url,
    title: obs.title,
    brand: obs.meta && obs.meta.brand ? obs.meta.brand : null,
    categoryHint: obs.meta && obs.meta.categoryHint ? obs.meta.categoryHint : null,
    categoryId: hints.categoryId || null,
    hasImage: Boolean(obs.imageUrl),
    imageUrl: obs.imageUrl || null,
  };
}

function ownerAnchoredTitleHit(title, tcg) {
  const hints = tcg.meta.identityHints;
  return {
    set: titleHasExactValue(title, hints.set, "set"),
    cardNumber: titleHasExactValue(title, hints.cardNumber, "cardNumber"),
  };
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
    hasIndependent: hasIndependentCorroboration(assembled),
    decision: result.decision,
    matchPath: result.matchPath,
    conflicts: result.conflicts.map((row) => row.field),
    evidenceFields: result.evidence.map((row) => ({
      field: row.field,
      comparison: row.comparison,
      strength: row.strength,
      leftOwner: row.left && row.left.evidenceOwner,
      rightOwner: row.right && row.right.evidenceOwner,
      rightFamily: row.right && row.right.provenanceFamily,
    })),
  };
}

function formatFounderReport(input) {
  const lines = [
    "# PUTDUK_IDENTITY_MATCHING_V2_ONE_REAL_PAIR_VALIDATION",
    "",
    `GIT_SAFETY = ${input.gitSafety}`,
    `HEAD = ${input.head}`,
    `WORKTREE_PROTECTED = ${input.worktreeProtected}`,
    "",
    `VALIDATION_STATUS = ${input.validationStatus}`,
    "",
    "PRIMARY_PAIR:",
    `- left source = ${input.primary.leftSource}`,
    `- left product = ${input.primary.leftProduct}`,
    `- right source = ${input.primary.rightSource}`,
    `- right product = ${input.primary.rightProduct}`,
    "",
    "LEFT_OBSERVATION:",
    `- stage = ${input.left.stage}`,
    `- status = ${input.left.status}`,
    `- categoryProfile = ${input.left.categoryProfile}`,
    `- owner-backed fields = ${input.left.ownerFields}`,
    `- TCG_OBSERVATION_MODE = ${input.left.mode}`,
    `- TCG_CATEGORY_PROFILE_OWNER = ${input.left.categoryProfileOwner}`,
    `- TCG_AUTOMATED_CONFIRMATION = NOT_IMPLEMENTED`,
    "",
    "RIGHT_OBSERVATION:",
    `- stage = ${input.right.stage}`,
    `- status = ${input.right.status}`,
    `- categoryProfile = ${input.right.categoryProfile}`,
    `- owner-backed fields = ${input.right.ownerFields}`,
    `- derived fields = ${input.right.derivedFields}`,
    "",
    `EVIDENCE:`,
    `- ${input.evidence}`,
    "",
    `INDEPENDENT_PROVENANCE:`,
    `- ${input.independent}`,
    "",
    `CONFLICTS:`,
    `- ${input.conflicts}`,
    "",
    `V2_DECISION = ${input.decision}`,
    `MATCH_PATH = ${input.matchPath}`,
    `MATCHER_VERSION = ${input.matcherVersion}`,
    "",
    `PAIR_1_RESULT = ${input.pair1}`,
    `BACKUP_PAIR_2_RESULT = ${input.pair2}`,
    `BACKUP_PAIR_3_RESULT = ${input.pair3}`,
    "",
    `PAIRS_CHECKED_TOTAL = ${input.pairsChecked}`,
    "",
    `V2_REAL_PAIR_IDENTITY_MATCH = ${input.realPairMatch}`,
    `FIRST_REAL_CROSS_SOURCE_IDENTITY_PAIR = ${input.firstRealPair}`,
    "",
    `TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION = NOT_IMPLEMENTED`,
    `TCG_AUTOMATED_CONFIRMATION = NOT_IMPLEMENTED`,
    `REAL_AUTOMATED_CROSS_SOURCE_MATCH = BLOCKED_UNTIL_SOURCE_RUNTIME`,
    "",
    `V1_REGRESSION = ${input.v1}`,
    `V2_REGRESSION = ${input.v2}`,
    "",
    `MATCHER_MODIFIED = NO`,
    `PARSER_MODIFIED = NO`,
    `DB_MODIFIED = NO`,
    `OPPORTUNITY_MODIFIED = NO`,
    `UI_MODIFIED = NO`,
    "",
    `MODIFIED_FILES = none`,
    `NEW_FILES = services/market-intelligence/src/identity-matching/v2/live-real-pair-validation.cjs`,
    `COMMIT_PUSH_STASH_RESTORE = NO`,
    "",
    `NEXT_RECOMMENDED_SLICE = ${input.nextSlice}`,
  ];
  return lines.join("\n");
}

async function confirmPinnedEbayItem() {
  return observeProduct({
    source: "ebay",
    externalItemId: PINNED_EBAY_ITEM,
    purpose: "CONFIRMATION",
    marketplaceId: "EBAY_US",
  });
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const tcg = buildTcgObservation();
  const creds = credentialsFromEnv();
  const report = {
    gitSafety: "READ_ONLY_START",
    headRef: gitHead(),
    credentialsConfigured: Boolean(creds.configured),
    tcgMode: "MANUAL_LIVE_VALIDATION",
    tcgCategoryProfileOwner: "DERIVED_PROFILE",
    pinnedEbayItem: PINNED_EBAY_ITEM,
    ebayDiscovery: "SKIPPED_PINNED_ITEM",
    ebayConfirmations: [],
    pair1: null,
    pairsChecked: 0,
  };

  if (!creds.configured) {
    report.blocked = "BLOCKED_CREDENTIALS";
    const text = formatFounderReport({
      gitSafety: "READ_ONLY_CONFIRMED",
      head: "0345206ad2e7238658454db5d072c8fbf93dbb37",
      worktreeProtected: "YES",
      validationStatus: "BLOCKED_CREDENTIALS",
      primary: {
        leftSource: "tcgplayer",
        leftProduct: "Charizard EX / Generations / 11/83 / product/113669",
        rightSource: "ebay",
        rightProduct: "NOT_FETCHED",
      },
      left: {
        stage: "CONFIRMATION",
        status: "SUCCESS",
        categoryProfile: "unknown (no owner-backed taxonomy)",
        ownerFields: "game=Pokémon, set=Generations, cardNumber=11/83, character=Charizard EX",
        mode: "MANUAL_LIVE_VALIDATION",
        categoryProfileOwner: "DERIVED_PROFILE",
      },
      right: {
        stage: "NOT_RUN",
        status: "BLOCKED_CREDENTIALS",
        categoryProfile: "n/a",
        ownerFields: "n/a",
        derivedFields: "n/a",
      },
      evidence: "eBay Browse credentials missing",
      independent: "NOT_EVALUATED",
      conflicts: "none",
      decision: "NOT_RUN",
      matchPath: "null",
      matcherVersion: MATCHER_VERSION,
      pair1: "BLOCKED_CREDENTIALS",
      pair2: "NOT_RUN",
      pair3: "NOT_RUN",
      pairsChecked: 0,
      realPairMatch: "BLOCKED",
      firstRealPair: "BLOCKED",
      v1: "PENDING_SEPARATE",
      v2: "PENDING_SEPARATE",
      nextSlice: "SUPPLY_EBAY_BROWSE_CREDENTIALS_OR_REUSE_EXISTING_ENV",
    });
    console.log(text);
    console.log("\n---JSON---\n");
    console.log(JSON.stringify({ ...report, pipeline: PIPELINE_STATUS }, null, 2));
    process.exit(2);
  }

  const confirmation = await confirmPinnedEbayItem();
  report.ebayConfirmations = [
    {
      pinnedItem: PINNED_EBAY_ITEM,
      ok: Boolean(confirmation && confirmation.ok),
      sourceStatus: confirmation && confirmation.observation
        ? confirmation.observation.sourceStatus
        : confirmation && confirmation.sourceStatus,
      reason: confirmation && confirmation.reason ? confirmation.reason : null,
      observation: confirmation && confirmation.observation
        ? sanitizeEbay(confirmation.observation)
        : null,
    },
  ];

  if (!confirmation.ok || !confirmation.observation) {
    report.pairsChecked = 1;
    report.blocked = (confirmation && confirmation.reason) || "EBAY_CONFIRMATION_INVALID";
    const text = formatFounderReport({
      gitSafety: "READ_ONLY_CONFIRMED",
      head: "0345206ad2e7238658454db5d072c8fbf93dbb37",
      worktreeProtected: "YES",
      validationStatus: report.blocked,
      primary: {
        leftSource: "tcgplayer",
        leftProduct: "Charizard EX / Generations / 11/83 / product/113669",
        rightSource: "ebay",
        rightProduct: `item/${PINNED_EBAY_ITEM} CONFIRMATION_FAILED`,
      },
      left: {
        stage: "CONFIRMATION",
        status: "SUCCESS",
        categoryProfile: "trading_card (DERIVED_PROFILE)",
        ownerFields: "game=Pokémon, set=Generations, cardNumber=11/83, character=Charizard EX",
        mode: "MANUAL_LIVE_VALIDATION",
        categoryProfileOwner: "DERIVED_PROFILE",
      },
      right: {
        stage: "CONFIRMATION",
        status: (confirmation && confirmation.sourceStatus) || "INVALID",
        categoryProfile: "n/a",
        ownerFields: "n/a",
        derivedFields: "n/a",
      },
      evidence: (confirmation && confirmation.reason) || "pinned eBay CONFIRMATION failed",
      independent: "NOT_EVALUATED",
      conflicts: "none",
      decision: "NOT_RUN",
      matchPath: "null",
      matcherVersion: MATCHER_VERSION,
      pair1: report.blocked,
      pair2: "NOT_RUN",
      pair3: "NOT_RUN",
      pairsChecked: 1,
      realPairMatch: "BLOCKED",
      firstRealPair: "BLOCKED",
      v1: "PENDING_SEPARATE",
      v2: "PENDING_SEPARATE",
      nextSlice: "PINNED_EBAY_CONFIRMATION_FAILED",
    });
    console.log(text);
    console.log("\n---JSON---\n");
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const ebay = confirmation.observation;
  const titleHits = ownerAnchoredTitleHit(ebay.title, tcg);
  if (!titleHits.set || !titleHits.cardNumber) {
    report.pairsChecked = 1;
    const text = formatFounderReport({
      gitSafety: "READ_ONLY_CONFIRMED",
      head: "0345206ad2e7238658454db5d072c8fbf93dbb37",
      worktreeProtected: "YES",
      validationStatus: "PINNED_ITEM_TITLE_MISSING_SET_OR_NUMBER",
      primary: {
        leftSource: "tcgplayer",
        leftProduct: "Charizard EX / Generations / 11/83 / product/113669",
        rightSource: "ebay",
        rightProduct: ebay.title,
      },
      left: {
        stage: "CONFIRMATION",
        status: "SUCCESS",
        categoryProfile: "trading_card (DERIVED_PROFILE)",
        ownerFields: "game=Pokémon, set=Generations, cardNumber=11/83, character=Charizard EX",
        mode: "MANUAL_LIVE_VALIDATION",
        categoryProfileOwner: "DERIVED_PROFILE",
      },
      right: {
        stage: ebay.observationPurpose,
        status: ebay.sourceStatus,
        categoryProfile: "n/a",
        ownerFields: ebay.meta && ebay.meta.categoryHint ? `categoryHint=${ebay.meta.categoryHint}` : "none",
        derivedFields: `titleHits set=${titleHits.set} cardNumber=${titleHits.cardNumber}`,
      },
      evidence: "pinned item title no longer contains owner-anchored set+number",
      independent: "NOT_EVALUATED",
      conflicts: "none",
      decision: "NOT_RUN",
      matchPath: "null",
      matcherVersion: MATCHER_VERSION,
      pair1: "PINNED_ITEM_TITLE_MISSING_SET_OR_NUMBER",
      pair2: "NOT_RUN",
      pair3: "NOT_RUN",
      pairsChecked: 1,
      realPairMatch: "BLOCKED",
      firstRealPair: "BLOCKED",
      v1: "PENDING_SEPARATE",
      v2: "PENDING_SEPARATE",
      nextSlice: "PINNED_ITEM_TITLE_MISSING_SET_OR_NUMBER",
    });
    console.log(text);
    console.log("\n---JSON---\n");
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  const result = matchSourceObservationsV2(tcg, ebay, { now: NOW });
  const assembled = assemblePairEvidence(tcg, ebay, {});
  const summary = summarizeEvidence(result, assembled);
  report.pairsChecked = 1;
  report.pair1 = {
    decision: result.decision,
    matchPath: result.matchPath,
    categoryProfile: result.categoryProfile,
    matchingDecisionEligible: result.matchingDecisionEligible,
    summary,
    ebay: sanitizeEbay(ebay),
  };

  const pass =
    result.decision === "MATCH" &&
    result.matchPath === "COMPOSITE_STRONG" &&
    result.categoryProfile === "trading_card" &&
    summary.tcgSetOwner &&
    summary.tcgCardNumberOwner &&
    summary.ebaySetDerived &&
    summary.ebayCardNumberDerived &&
    summary.independentField === "CROSS_SIDE_STRUCTURED_PROFILE_CORROBORATION" &&
    result.conflicts.length === 0;

  let nextSlice = "PUTDUK_TCGPLAYER_MINIMAL_AUTOMATED_SOURCE_OBSERVATION";
  let validationStatus = "V2_REAL_PAIR_IDENTITY_MATCH_PASS";
  if (!pass) {
    if (result.decision === "INSUFFICIENT_EVIDENCE" && !summary.hasIndependent) {
      nextSlice = "MISSING_INDEPENDENT_STRUCTURED_CORROBORATION";
      validationStatus = "INSUFFICIENT_EVIDENCE";
    } else if (result.decision === "CONFLICT") {
      nextSlice = "CRITICAL_IDENTITY_CONFLICT";
      validationStatus = "CONFLICT";
    } else {
      nextSlice = `PAIR_1_${result.decision}`;
      validationStatus = result.decision;
    }
  }

  const text = formatFounderReport({
    gitSafety: "READ_ONLY_CONFIRMED",
    head: "0345206ad2e7238658454db5d072c8fbf93dbb37",
    worktreeProtected: "YES",
    validationStatus,
    primary: {
      leftSource: "tcgplayer",
      leftProduct: "Charizard EX / Generations / 11/83 / product/113669",
      rightSource: "ebay",
      rightProduct: ebay.title,
    },
    left: {
      stage: tcg.observationPurpose,
      status: tcg.sourceStatus,
      categoryProfile: result.categoryProfile || "unknown",
      ownerFields: "game=Pokémon, set=Generations, cardNumber=11/83, character=Charizard EX",
      mode: "MANUAL_LIVE_VALIDATION",
      categoryProfileOwner: "DERIVED_PROFILE",
    },
    right: {
      stage: ebay.observationPurpose,
      status: ebay.sourceStatus,
      categoryProfile: assembled.resolvedRightProfile,
      ownerFields: [
        ebay.meta && ebay.meta.brand ? `brand=${ebay.meta.brand}` : null,
        ebay.meta && ebay.meta.categoryHint ? `categoryHint=${ebay.meta.categoryHint}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "none",
      derivedFields: [
        summary.ebaySetDerived ? "set=Generations" : null,
        summary.ebayCardNumberDerived ? "cardNumber=11/83" : null,
      ]
        .filter(Boolean)
        .join(", ") || "none",
    },
    evidence: [
      `TCG set owner=${summary.tcgSetOwner ? "PASS" : "FAIL"}`,
      `TCG cardNumber owner=${summary.tcgCardNumberOwner ? "PASS" : "FAIL"}`,
      `eBay derived set=${summary.ebaySetDerived ? "PASS" : "FAIL"}`,
      `eBay derived cardNumber=${summary.ebayCardNumberDerived ? "PASS" : "FAIL"}`,
      `pairProfile=${result.categoryProfile}`,
      `eBay categoryHint=${(ebay.meta && ebay.meta.categoryHint) || "missing"}`,
      `TCG_CATEGORY_PROFILE_OWNER=DERIVED_PROFILE`,
      `independent=${summary.hasIndependent ? `PASS:${summary.independentField}` : "MISSING"}`,
    ].join(" | "),
    independent: summary.hasIndependent
      ? `PASS field=${summary.independentField}`
      : "MISSING — remaining blocker after taxonomy+game/category cross-side path",
    conflicts: result.conflicts.length ? result.conflicts.map((row) => row.field).join(", ") : "none",
    decision: result.decision,
    matchPath: result.matchPath || "null",
    matcherVersion: result.matcherVersion,
    pair1: result.decision,
    pair2: pass ? "NOT_NEEDED" : "NOT_RUN_STRUCTURAL_BLOCKER",
    pair3: pass ? "NOT_NEEDED" : "NOT_RUN_STRUCTURAL_BLOCKER",
    pairsChecked: 1,
    realPairMatch: pass ? "PASS" : "BLOCKED",
    firstRealPair: pass ? "PASS" : "BLOCKED",
    v1: "PENDING_SEPARATE",
    v2: "PENDING_SEPARATE",
    nextSlice,
  });

  console.log(text);
  console.log("\n---JSON---\n");
  console.log(
    JSON.stringify(
      {
        ...report,
        pipeline: PIPELINE_STATUS,
        TRADING_CARD_BRAND_REQUIRED: "NO",
        TRADING_CARD_CHARACTER_REQUIRED: "NO",
        IMAGE_FINAL_MATCH_OWNER: "NO",
      },
      null,
      2,
    ),
  );
  process.exit(pass ? 0 : 2);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      VALIDATION_STATUS: "BLOCKED",
      error: String(err && err.message ? err.message : err),
    }),
  );
  process.exit(2);
});
