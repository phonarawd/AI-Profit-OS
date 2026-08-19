#!/usr/bin/env node
/**
 * Fashionphile public JSON identity forensic.
 * parser enrichment 없음. credential 출력 없음.
 * variants[0]은 구조 sample일 뿐 canonical owner가 아니다.
 */

const { parsePublicJson } = require("./extract/public-json.cjs");
const { parseFashionphileDocument } = require("./adapters/fashionphile.cjs");

const CONFIRM_JSON_URL =
  "https://www.fashionphile.com/products/hermes-epsom-mini-kelly-sellier-20-black-1956054.json";
const CONFIRM_PAGE_URL =
  "https://www.fashionphile.com/products/hermes-epsom-mini-kelly-sellier-20-black-1956054";

const PLACEHOLDER_BARCODE = new Set(["", "0", "does not apply", "n/a", "na", "unknown", "none"]);

function asString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function looksGtinShape(raw) {
  return /^\d{8}$|^\d{12,14}$/.test(asString(raw));
}

function isPlaceholderBarcode(raw) {
  return PLACEHOLDER_BARCODE.has(asString(raw).toLowerCase());
}

function isSkuDerivedBarcode(barcode, sku) {
  const b = asString(barcode);
  const s = asString(sku);
  if (!b || !s) return false;
  if (b === `0000${s}0`) return true;
  if (b.includes(s) && /^0+\d+0$/.test(b) && b.replace(/^0+/, "").replace(/0$/, "") === s) {
    return true;
  }
  return false;
}

function unique(values) {
  return [...new Set(values.map((v) => (v == null ? "null" : String(v))))];
}

function classifyBarcode(values, skus) {
  const present = values.some((v) => v !== "KEY_ABSENT");
  const nonempty = values.filter((v) => v && v !== "KEY_ABSENT" && v !== "null");
  if (!present) {
    return {
      fieldPath: "variants[].barcode",
      value: "NOT_PRESENT",
      fieldPresent: false,
      ownerBacked: false,
      classification: "NOT_PRESENT",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "barcode key absent on all variants",
    };
  }
  if (nonempty.length === 0 || nonempty.every((v) => isPlaceholderBarcode(v))) {
    return {
      fieldPath: "variants[].barcode",
      value: nonempty[0] || null,
      fieldPresent: true,
      ownerBacked: false,
      classification: "INVALID",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "barcode empty or placeholder",
    };
  }
  const distinct = unique(nonempty);
  if (distinct.length > 1) {
    return {
      fieldPath: "variants[].barcode",
      value: distinct.join("|"),
      fieldPresent: true,
      ownerBacked: true,
      classification: "AMBIGUOUS",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "barcode differs across variants — not product-level identity",
    };
  }
  const barcode = nonempty[0];
  const sku = skus.find((s) => s && s !== "KEY_ABSENT" && s !== "null") || "";
  if (isSkuDerivedBarcode(barcode, sku)) {
    return {
      fieldPath: "variants[].barcode",
      value: barcode,
      fieldPresent: true,
      ownerBacked: true,
      classification: "SOURCE_LOCAL_ONLY",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "barcode constructed from Fashionphile SKU (0000+sku+0) — manufacturer GTIN not proven",
    };
  }
  if (looksGtinShape(barcode)) {
    return {
      fieldPath: "variants[].barcode",
      value: barcode,
      fieldPresent: true,
      ownerBacked: true,
      classification: "AMBIGUOUS",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "numeric barcode shape only — GS1/manufacturer semantics not proven",
    };
  }
  return {
    fieldPath: "variants[].barcode",
    value: barcode,
    fieldPresent: true,
    ownerBacked: true,
    classification: "AMBIGUOUS",
    v1MatchUseful: false,
    parserMapping: "NO_CHANGE",
    reason: "barcode present but not a proven GTIN",
  };
}

function classifyProductType(productType) {
  const value = asString(productType);
  if (!value) {
    return {
      fieldPath: "product.product_type",
      value: "NOT_PRESENT",
      fieldPresent: false,
      ownerBacked: false,
      classification: "NOT_PRESENT",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "product_type absent",
    };
  }
  return {
    fieldPath: "product.product_type",
    value,
    fieldPresent: true,
    ownerBacked: true,
    classification: "CORROBORATING_IDENTITY",
    v1MatchUseful: false,
    parserMapping: "NO_CHANGE",
    reason: "current profile contract does not accept this source vocabulary",
  };
}

function classifyOptions(options, option1, option2, option3) {
  const names = (options || []).map((row) => asString(row && row.name));
  const titleOnly =
    names.length === 1 &&
    names[0].toLowerCase() === "title" &&
    unique(option1.filter((v) => v && v !== "KEY_ABSENT")).every(
      (v) => v === "Default Title" || v === "null",
    );
  return {
    fieldPath: "options[]+variants[].option1/2/3",
    value: titleOnly ? "Title=Default Title" : names.join(",") || "NOT_PRESENT",
    fieldPresent: names.length > 0,
    ownerBacked: names.length > 0 && !titleOnly,
    classification: titleOnly ? "PRESENTATION_ONLY" : names.length ? "AMBIGUOUS" : "NOT_PRESENT",
    v1MatchUseful: false,
    parserMapping: "NO_CHANGE",
    reason: titleOnly
      ? "Shopify default title option is not size/color/model"
      : "option semantics not proven as size/color/model",
    option2Present: option2.some((v) => v && v !== "KEY_ABSENT" && v !== "null"),
    option3Present: option3.some((v) => v && v !== "KEY_ABSENT" && v !== "null"),
  };
}

function classifyTags(tags) {
  const value = Array.isArray(tags) ? tags.join(", ") : asString(tags);
  if (!value) {
    return {
      fieldPath: "product.tags",
      value: "NOT_PRESENT",
      fieldPresent: false,
      ownerBacked: false,
      classification: "NOT_PRESENT",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "tags absent",
    };
  }
  return {
    fieldPath: "product.tags",
    value,
    fieldPresent: true,
    ownerBacked: true,
    classification: "PRESENTATION_ONLY",
    v1MatchUseful: false,
    parserMapping: "NO_CHANGE",
    reason: "marketing/search tags — not canonical product identity",
  };
}

/**
 * @param {object} product
 */
function inspectVariants(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const keyUnion = new Set();
  const barcodes = [];
  const skus = [];
  const option1 = [];
  const option2 = [];
  const option3 = [];
  for (const variant of variants) {
    if (!variant || typeof variant !== "object") continue;
    for (const key of Object.keys(variant)) keyUnion.add(key);
    barcodes.push(
      Object.prototype.hasOwnProperty.call(variant, "barcode")
        ? variant.barcode == null
          ? "null"
          : String(variant.barcode)
        : "KEY_ABSENT",
    );
    skus.push(
      Object.prototype.hasOwnProperty.call(variant, "sku")
        ? variant.sku == null
          ? "null"
          : String(variant.sku)
        : "KEY_ABSENT",
    );
    option1.push(
      Object.prototype.hasOwnProperty.call(variant, "option1")
        ? variant.option1 == null
          ? "null"
          : String(variant.option1)
        : "KEY_ABSENT",
    );
    option2.push(
      Object.prototype.hasOwnProperty.call(variant, "option2")
        ? variant.option2 == null
          ? "null"
          : String(variant.option2)
        : "KEY_ABSENT",
    );
    option3.push(
      Object.prototype.hasOwnProperty.call(variant, "option3")
        ? variant.option3 == null
          ? "null"
          : String(variant.option3)
        : "KEY_ABSENT",
    );
  }
  return {
    variantCount: variants.length,
    variantKeyUnion: [...keyUnion].sort(),
    barcodes,
    skus,
    option1,
    option2,
    option3,
  };
}

/**
 * @param {unknown} document
 */
function classifyFashionphileIdentityDocument(document) {
  const parsed = parsePublicJson(document);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }
  const doc = parsed.document;
  const product = doc.product && typeof doc.product === "object" ? doc.product : doc;
  if (!product || typeof product !== "object") {
    return { ok: false, reason: "product_missing" };
  }

  const variants = inspectVariants(product);
  const ownerMap = [
    {
      fieldPath: "product.vendor",
      value: asString(product.vendor) || "NOT_PRESENT",
      fieldPresent: Boolean(asString(product.vendor)),
      ownerBacked: Boolean(asString(product.vendor)),
      classification: "CORROBORATING_IDENTITY",
      v1MatchUseful: false,
      parserMapping: "EXISTING_meta.brand",
      reason: "brand already extracted — brand-only is not V1 MATCH",
    },
    {
      fieldPath: "product.title",
      value: asString(product.title) || "NOT_PRESENT",
      fieldPresent: Boolean(asString(product.title)),
      ownerBacked: false,
      classification: "PRESENTATION_ONLY",
      v1MatchUseful: false,
      parserMapping: "EXISTING_title",
      reason: "title is not an identity owner",
    },
    {
      fieldPath: "variants[].sku",
      value: unique(variants.skus).join("|"),
      fieldPresent: variants.skus.some((v) => v !== "KEY_ABSENT"),
      ownerBacked: true,
      classification: "SOURCE_LOCAL_ONLY",
      v1MatchUseful: false,
      parserMapping: "EXISTING_meta.sku",
      reason: "Fashionphile SKU remains source-local — not eBay MPN",
    },
    classifyProductType(product.product_type),
    classifyTags(product.tags),
    classifyBarcode(variants.barcodes, variants.skus),
    classifyOptions(product.options, variants.option1, variants.option2, variants.option3),
    {
      fieldPath: "product.handle",
      value: asString(product.handle) || "NOT_PRESENT",
      fieldPresent: Boolean(asString(product.handle)),
      ownerBacked: true,
      classification: "SOURCE_LOCAL_ONLY",
      v1MatchUseful: false,
      parserMapping: "NO_CHANGE",
      reason: "handle is source-local locator",
    },
  ];

  const ownerBacked = ownerMap.some((row) => row.ownerBacked);
  const v1Useful = ownerMap.some((row) => row.v1MatchUseful);
  let caseId = "B1";
  let ownerStatus = "BLOCKED_NO_OWNER";
  let v1Status = "BLOCKED_NO_OWNER";
  if (v1Useful) {
    caseId = "A";
    ownerStatus = "PASS";
    v1Status = "PASS";
  } else if (ownerBacked) {
    caseId = "B2";
    ownerStatus = "PARTIAL";
    v1Status = "BLOCKED_NO_V1_USABLE_OWNER";
  }

  return {
    ok: true,
    caseId,
    canonicalPaths: {
      gtin: "meta.identityHints.gtin",
      color: "meta.identityHints.color",
      size: "meta.size",
      categoryHint: "meta.categoryHint",
      model: "meta.model",
      modelNumber: "meta.modelNumber",
      sku: "meta.sku",
      brand: "meta.brand",
    },
    productRootKeys: Object.keys(product).sort(),
    variantCount: variants.variantCount,
    variantKeyUnion: variants.variantKeyUnion,
    barcodes: variants.barcodes,
    skus: variants.skus,
    ownerMap,
    FASHIONPHILE_OWNER_BACKED_IDENTITY: ownerStatus,
    FASHIONPHILE_V1_USABLE_IDENTITY: v1Status,
  };
}

function parserDidNotEnrich(observation) {
  if (!observation || !observation.meta) return { ok: false, reason: "observation_missing" };
  const hints = observation.meta.identityHints || {};
  const failures = [];
  if (hints.gtin) failures.push("parser_promoted_gtin");
  if (observation.meta.categoryHint) failures.push("parser_promoted_categoryHint");
  if (observation.meta.model) failures.push("parser_promoted_model");
  if (observation.meta.modelNumber) failures.push("parser_promoted_modelNumber");
  if (observation.meta.size) failures.push("parser_promoted_size");
  if (hints.color) failures.push("parser_promoted_color");
  if (observation.displayAuthorized !== false) failures.push("displayAuthorized_changed");
  return { ok: failures.length === 0, failures };
}

async function runLiveForensic(fetchImpl) {
  const impl = fetchImpl || globalThis.fetch;
  if (typeof impl !== "function") {
    return { ok: false, httpLive: "BLOCKED", reason: "fetch_unavailable" };
  }
  let response;
  try {
    response = await impl(CONFIRM_JSON_URL, { headers: { accept: "application/json" } });
  } catch {
    return { ok: false, httpLive: "BLOCKED", reason: "fetch_error" };
  }
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    return { ok: false, httpLive: "BLOCKED", reason: `http_${response.status}` };
  }
  if (!response.ok) {
    return { ok: false, httpLive: "FAIL", reason: `http_${response.status}` };
  }
  const text = await response.text();
  const classified = classifyFashionphileIdentityDocument(text);
  if (!classified.ok) {
    return { ok: false, httpLive: "FAIL", reason: classified.reason };
  }
  const parsed = parseFashionphileDocument({
    document: text,
    purpose: "CONFIRMATION",
    url: CONFIRM_JSON_URL,
  });
  const enrichment = parsed.ok && parsed.observation ? parserDidNotEnrich(parsed.observation) : {
    ok: false,
    failures: [parsed.reason || "parse_failed"],
  };
  return {
    ok: true,
    httpLive: "PASS",
    url: CONFIRM_PAGE_URL,
    classified,
    parserEnrichment: enrichment.ok ? "NOT_APPLIED" : "UNEXPECTED",
    parserFailures: enrichment.failures || [],
  };
}

async function main() {
  const live = await runLiveForensic();
  const report = {
    FASHIONPHILE_LIVE_FORENSIC: live.httpLive,
    CASE: live.classified ? live.classified.caseId : null,
    FASHIONPHILE_OWNER_BACKED_IDENTITY: live.classified
      ? live.classified.FASHIONPHILE_OWNER_BACKED_IDENTITY
      : null,
    FASHIONPHILE_V1_USABLE_IDENTITY: live.classified
      ? live.classified.FASHIONPHILE_V1_USABLE_IDENTITY
      : null,
    FASHIONPHILE_IDENTITY_ENRICHMENT: "NOT_REQUIRED",
    REAL_MATCH_RETRY: live.classified && live.classified.caseId === "B2"
      ? "BLOCKED_NO_V1_USABLE_OWNER"
      : live.classified && live.classified.caseId === "B1"
        ? "BLOCKED_NO_USABLE_OWNER"
        : "NOT_RUN",
    canonicalPaths: live.classified ? live.classified.canonicalPaths : null,
    variantCount: live.classified ? live.classified.variantCount : null,
    variantKeyUnion: live.classified ? live.classified.variantKeyUnion : null,
    LIVE_DOCUMENT_OWNER_MAP: live.classified ? live.classified.ownerMap : null,
    parserEnrichment: live.parserEnrichment || null,
    reason: live.reason || null,
  };
  console.log(JSON.stringify(report, null, 2));
  if (live.httpLive === "BLOCKED") process.exit(2);
  if (!live.ok || live.parserEnrichment === "UNEXPECTED") process.exit(1);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(
      JSON.stringify({
        FASHIONPHILE_LIVE_FORENSIC: "BLOCKED",
        error: String(err && err.message ? err.message : err),
      }),
    );
    process.exit(2);
  });
}

module.exports = {
  CONFIRM_JSON_URL,
  classifyFashionphileIdentityDocument,
  parserDidNotEnrich,
  isSkuDerivedBarcode,
  looksGtinShape,
  runLiveForensic,
};
