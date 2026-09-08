/**
 * Engine §0.0.2c — observation → Asset Master identity.
 * SOURCE_OBSERVATION != LISTING_LEG · fuzzy-alone auto-publish 0.
 * Unique brand+model+size (color 생략) = image/link attach only.
 */

const { evaluateBagListingMatch } = require("./bag-match.cjs");
const { evaluateWatchListingMatch } = require("./watch-match.cjs");
const { evaluateCardListingMatch } = require("./card-match.cjs");
const {
  tradingCardSeedsAsAssetMasters,
} = require("./trading-card-seed.cjs");
const { luxuryBagSeedsAsAssetMasters } = require("./luxury-bag-seed.cjs");
const { watchSeedsAsAssetMasters } = require("./watch-seed.cjs");

const OBSERVATION_MATCHER_VERSION = "observation-identity.v1";
const FASHIONPHILE_SHOPIFY_PATH = "/s/files/1/0894/3186/7695/";

const COLOR_ALIASES = Object.freeze({
  noir: "black",
  black: "black",
  gold: "gold",
  etoupe: "etoupe",
  beige: "beige",
  navy: "navy",
  orange: "orange",
  monogram: "monogram",
  "epi noir": "epi noir",
  "epi black": "epi noir",
  "empreinte noir": "empreinte noir",
  "empreinte black": "empreinte noir",
});

const SIZE_ALIASES = Object.freeze({
  medium: "medium",
  md: "medium",
  m: "medium",
  small: "small",
  sm: "small",
  s: "small",
  large: "large",
  lg: "large",
  l: "large",
  tpm: "tpm",
});

function defaultDay1Masters() {
  return [
    ...tradingCardSeedsAsAssetMasters(),
    ...luxuryBagSeedsAsAssetMasters(),
    ...watchSeedsAsAssetMasters(),
  ];
}

function normLoose(v) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function aliasColor(v) {
  const n = normLoose(v);
  return COLOR_ALIASES[n] || n;
}

function aliasSize(v) {
  const n = normLoose(v);
  return SIZE_ALIASES[n] || n;
}

function titleContains(haystackNorm, needle) {
  const n = normLoose(needle);
  if (!n) return false;
  return haystackNorm.includes(n);
}

function isFashionphileImageHost(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host === "cdn.shopify.com") {
      return parsed.pathname.startsWith(FASHIONPHILE_SHOPIFY_PATH);
    }
    return host === "www.fashionphile.com" || host.endsWith(".fashionphile.com");
  } catch {
    return false;
  }
}

function observationHaystack(obs) {
  const title = String(obs.title ?? "").trim();
  const brand =
    obs.meta && typeof obs.meta === "object"
      ? String(obs.meta.brand ?? "").trim()
      : "";
  return [brand, title].filter(Boolean).join(" ");
}

function observationMetaFromEvidence(haystack, asset) {
  const meta = asset.meta && typeof asset.meta === "object" ? asset.meta : {};
  const hay = normLoose(haystack);
  const category = String(asset.category || meta.category || "");

  if (category === "luxury_bag") {
    const brand = meta.brand != null ? String(meta.brand) : "";
    const model = meta.model != null ? String(meta.model) : "";
    const size = meta.size != null ? String(meta.size) : "";
    const color = meta.color != null ? String(meta.color) : "";
    if (!titleContains(hay, brand) || !titleContains(hay, model)) return null;
    if (size && !titleContains(hay, size) && !titleContains(hay, aliasSize(size))) {
      return null;
    }
    const colorOk =
      !color ||
      titleContains(hay, color) ||
      titleContains(hay, aliasColor(color));
    return {
      brand,
      model,
      ...(size ? { size } : {}),
      ...(colorOk && color ? { color } : {}),
      colorPresent: Boolean(colorOk && color),
      sizePresent: Boolean(size),
    };
  }

  if (category === "watch") {
    const brand = meta.brand != null ? String(meta.brand) : "";
    const reference = meta.reference != null ? String(meta.reference) : "";
    const model = meta.model != null ? String(meta.model) : "";
    if (!titleContains(hay, brand) || !titleContains(hay, reference)) {
      return null;
    }
    return { brand, reference, ...(model ? { model } : {}) };
  }

  if (category === "trading_card") {
    const set = meta.set != null ? String(meta.set) : "";
    const setName = meta.setName != null ? String(meta.setName) : "";
    const number = meta.number != null ? String(meta.number) : "";
    const finish = meta.finish != null ? String(meta.finish) : "normal";
    const lang = meta.lang != null ? String(meta.lang) : "en";
    const setOk = titleContains(hay, setName) || titleContains(hay, set);
    const numberOk = titleContains(hay, number);
    if (!setOk || !numberOk) return null;
    return { set, number, lang, finish };
  }

  return null;
}

function evaluateExact(asset, listingMeta, title) {
  const meta = asset.meta && typeof asset.meta === "object" ? asset.meta : {};
  const category = String(asset.category || meta.category || "");
  if (category === "luxury_bag") {
    return evaluateBagListingMatch({
      assetMeta: {
        brand: meta.brand != null ? String(meta.brand) : undefined,
        model: meta.model != null ? String(meta.model) : undefined,
        size: meta.size != null ? String(meta.size) : undefined,
        color: meta.color != null ? String(meta.color) : undefined,
      },
      listingMeta: {
        brand: listingMeta.brand,
        model: listingMeta.model,
        size: listingMeta.size,
        color: listingMeta.color,
      },
      listingTitle: title,
    });
  }
  if (category === "watch") {
    return evaluateWatchListingMatch({
      assetMeta: {
        brand: meta.brand != null ? String(meta.brand) : undefined,
        reference: meta.reference != null ? String(meta.reference) : undefined,
        model: meta.model != null ? String(meta.model) : undefined,
      },
      listingMeta,
      listingTitle: title,
    });
  }
  if (category === "trading_card") {
    return evaluateCardListingMatch({
      assetMeta: {
        set: meta.set != null ? String(meta.set) : undefined,
        number: meta.number != null ? String(meta.number) : undefined,
        lang: meta.lang != null ? String(meta.lang) : "en",
        finish: meta.finish != null ? String(meta.finish) : "normal",
      },
      listingMeta,
      listingTitle: title,
    });
  }
  return { canAutoPublish: false, identity: { exact: false, fuzzy: false } };
}

function categoryHintOf(obs) {
  if (obs.meta && typeof obs.meta === "object" && obs.meta.categoryHint) {
    return String(obs.meta.categoryHint);
  }
  return "";
}

function resolveObservationMatches(input) {
  const masters = Array.isArray(input.masters)
    ? input.masters
    : defaultDay1Masters();
  const at = input.now || new Date().toISOString();
  const matched = [];
  const unmatched = [];
  const matchAttempts = [];

  for (const raw of Array.isArray(input.observations) ? input.observations : []) {
    if (!raw || typeof raw !== "object") continue;
    const obs = raw;
    const source = String(obs.source || obs.adapterId || "").trim();
    const haystack = observationHaystack(obs);
    const hint = categoryHintOf(obs);
    const candidates = hint
      ? masters.filter((m) => String(m.category || m.meta?.category) === hint)
      : masters;

    const exactHits = [];
    const uniqueHits = [];
    for (const asset of candidates) {
      const listingMeta = observationMetaFromEvidence(haystack, asset);
      if (!listingMeta) continue;
      const ev = evaluateExact(asset, listingMeta, haystack);
      if (ev && ev.canAutoPublish === true) {
        exactHits.push({ asset, eval: ev, listingMeta, reason: "exact_identity" });
        continue;
      }
      if (listingMeta.brand && listingMeta.model && listingMeta.sizePresent && listingMeta.size) {
        uniqueHits.push({
          asset,
          eval: ev,
          listingMeta,
          reason: "unique_size",
        });
      }
    }

    let hits = exactHits;
    if (hits.length === 0) hits = uniqueHits;

    if (hits.length !== 1) {
      const failReason =
        hits.length === 0 ? "no_exact_identity_match" : "ambiguous_exact_match";
      unmatched.push({
        source,
        externalItemId:
          obs.externalItemId != null ? String(obs.externalItemId) : null,
        title: obs.title != null ? String(obs.title) : null,
        reason: failReason,
        hitCount: hits.length,
        persistToListingLeg: false,
      });
      matchAttempts.push({
        adapterId: source || "observation",
        matched: false,
        reason: failReason,
        at,
      });
      continue;
    }

    const hit = hits[0];
    matched.push({
      ...obs,
      assetId: hit.asset.assetId,
      matchedAssetLabel: hit.asset.assetLabel,
      identityMatch: hit.reason,
      persistToListingLeg: false,
      matcherVersion: OBSERVATION_MATCHER_VERSION,
      category: hit.asset.category,
    });
    matchAttempts.push({
      adapterId: source || "observation",
      category: hit.asset.category,
      matched: true,
      reason: hit.reason,
      at,
    });
  }

  return {
    matched,
    unmatched,
    matchAttempts,
    persistToListingLeg: false,
    matcherVersion: OBSERVATION_MATCHER_VERSION,
    stats: {
      input: Array.isArray(input.observations) ? input.observations.length : 0,
      matched: matched.length,
      unmatched: unmatched.length,
    },
  };
}

module.exports = {
  OBSERVATION_MATCHER_VERSION,
  FASHIONPHILE_SHOPIFY_PATH,
  isFashionphileImageHost,
  observationHaystack,
  observationMetaFromEvidence,
  resolveObservationMatches,
};
