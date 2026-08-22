/**
 * 관측 1건에서 blocking key를 뽑는다.
 * title/image/price/source-local은 key가 아니다.
 * WATCH_REFERENCE와 eBay MPN을 같은 타입으로 쓰지 않는다.
 */

const {
  asString,
  normalizeText,
  normalizeIdentifierValue,
  extractTypedIdentifiers,
} = require("../identity-matching/normalize.cjs");
const {
  titleHasExactValue,
  resolveSingleProfileV2,
  isSneakerStyleAspect,
} = require("../identity-matching/v2/evidence.cjs");
const {
  MVP_CATEGORY_PROFILES,
  DEFERRED_CATEGORY_PROFILES,
} = require("../canonical-product/generic-profile.cjs");

const MVP = new Set(MVP_CATEGORY_PROFILES);
const DEFERRED = new Set(DEFERRED_CATEGORY_PROFILES);

function metaOf(obs) {
  return obs && obs.meta && typeof obs.meta === "object" ? obs.meta : {};
}

function hintsOf(obs) {
  const meta = metaOf(obs);
  return meta.identityHints && typeof meta.identityHints === "object"
    ? meta.identityHints
    : {};
}

function isEligibleObservation(obs) {
  return (
    asString(obs && obs.observationPurpose) === "CONFIRMATION" &&
    asString(obs && obs.sourceStatus) === "SUCCESS"
  );
}

function explicitCategoryProfile(obs) {
  return asString(hintsOf(obs).categoryProfile);
}

function resolveCandidateProfile(obs) {
  const explicit = explicitCategoryProfile(obs);
  if (DEFERRED.has(explicit)) {
    return { profile: explicit, deferred: true, unsupported: false };
  }
  const resolved = resolveSingleProfileV2(obs);
  if (MVP.has(resolved)) {
    return { profile: resolved, deferred: false, unsupported: false };
  }
  if (explicit && !MVP.has(explicit) && !DEFERRED.has(explicit)) {
    return { profile: explicit, deferred: false, unsupported: true };
  }
  return { profile: resolved || "unknown", deferred: false, unsupported: false };
}

function hintOwner(obs, field, normalize) {
  const hints = hintsOf(obs);
  const meta = metaOf(obs);
  const raw = asString(hints[field] || meta[field]);
  if (!raw) return null;
  return {
    value: raw,
    normalizedValue: normalize(raw),
    ownerBacked: true,
  };
}

function cardNumberOwner(obs) {
  const hints = hintsOf(obs);
  const raw = asString(hints.cardNumber || hints.number);
  if (!raw) return null;
  return {
    value: raw,
    normalizedValue: normalizeIdentifierValue(raw),
    ownerBacked: true,
  };
}

function styleOwner(obs) {
  const hints = hintsOf(obs);
  const raw = asString(hints.manufacturerStyleCode || hints.styleCode);
  if (!raw || isSneakerStyleAspect(raw)) return null;
  return {
    value: raw,
    normalizedValue: normalizeIdentifierValue(raw),
    ownerBacked: true,
  };
}

function brandOf(obs) {
  return hintOwner(obs, "brand", normalizeText);
}

function pushRecord(records, rec) {
  if (!rec || !rec.key || !rec.family) return;
  records.push({
    family: rec.family,
    key: rec.key,
    reason: rec.reason,
    ownerAnchored: Boolean(rec.ownerAnchored),
    anchors: rec.anchors || null,
  });
}

function extractBlockingRecords(obs) {
  const profileInfo = resolveCandidateProfile(obs);
  const records = [];
  const source = asString(obs && obs.source);
  const brand = brandOf(obs);
  const identifiers = extractTypedIdentifiers(obs);

  for (const id of identifiers || []) {
    if (id.type === "GTIN" && id.value) {
      pushRecord(records, {
        family: "TYPED_GTIN",
        key: `gtin:${id.value}`,
        reason: "TYPED_IDENTIFIER_EXACT",
      });
    }
    if (id.type === "MPN" && id.value && id.brand) {
      pushRecord(records, {
        family: "TYPED_MPN",
        key: `mpn:${id.brand}:${id.value}`,
        reason: "TYPED_IDENTIFIER_EXACT",
      });
    }
    if (id.type === "WATCH_REFERENCE" && id.value && id.brand) {
      pushRecord(records, {
        family: "WATCH_BRAND_REFERENCE",
        key: `watch:${id.brand}:${id.value}`,
        reason: "TYPED_IDENTIFIER_EXACT",
        ownerAnchored: true,
        anchors: { brand: id.brand, manufacturerReference: id.value },
      });
    }
  }

  const hints = hintsOf(obs);
  if (
    source !== "ebay" &&
    source !== "fashionphile" &&
    source !== "chrono24" &&
    brand &&
    asString(hints.mpn)
  ) {
    pushRecord(records, {
      family: "TYPED_MPN",
      key: `mpn:${brand.normalizedValue}:${normalizeIdentifierValue(hints.mpn)}`,
      reason: "TYPED_IDENTIFIER_EXACT",
    });
  }

  if (profileInfo.profile === "trading_card" && !profileInfo.deferred) {
    const set = hintOwner(obs, "set", normalizeText);
    const cardNumber = cardNumberOwner(obs);
    if (set && cardNumber && set.ownerBacked && cardNumber.ownerBacked) {
      pushRecord(records, {
        family: "TRADING_CARD_SET_NUMBER",
        key: `trading_card:${set.normalizedValue}:${cardNumber.normalizedValue}`,
        reason: "CATEGORY_NATIVE_OWNER_EXACT",
        ownerAnchored: true,
        anchors: { set: set.value, cardNumber: cardNumber.value },
      });
    }
  }

  if (profileInfo.profile === "sneakers" && !profileInfo.deferred) {
    const style = styleOwner(obs);
    if (brand && style && style.ownerBacked) {
      pushRecord(records, {
        family: "SNEAKER_STYLE",
        key: `sneakers:${brand.normalizedValue}:${style.normalizedValue}`,
        reason: "CATEGORY_NATIVE_OWNER_EXACT",
        ownerAnchored: true,
        anchors: { brand: brand.value, manufacturerStyleCode: style.value },
      });
    }
  }

  if (profileInfo.profile === "watch" && !profileInfo.deferred && brand) {
    const ref = hintOwner(obs, "manufacturerReference", normalizeIdentifierValue);
    if (ref) {
      pushRecord(records, {
        family: "WATCH_BRAND_REFERENCE",
        key: `watch:${brand.normalizedValue}:${ref.normalizedValue}`,
        reason: "CATEGORY_NATIVE_OWNER_EXACT",
        ownerAnchored: true,
        anchors: { brand: brand.value, manufacturerReference: ref.value },
      });
    }
  }

  if (profileInfo.profile === "luxury_bag" && !profileInfo.deferred) {
    const model = hintOwner(obs, "model", normalizeText);
    const size = hintOwner(obs, "size", normalizeText);
    const color = hintOwner(obs, "color", normalizeText);
    if (brand && model && size && color) {
      pushRecord(records, {
        family: "LUXURY_BAG_IDENTITY",
        key: `luxury_bag:${brand.normalizedValue}:${model.normalizedValue}:${size.normalizedValue}:${color.normalizedValue}`,
        reason: "CATEGORY_NATIVE_OWNER_EXACT",
      });
    }
  }

  records.sort((a, b) => {
    const fa = `${a.family}|${a.key}`;
    const fb = `${b.family}|${b.key}`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });

  return {
    id: asString(obs && obs.id) || null,
    source,
    title: asString(obs && obs.title) || "",
    eligible: isEligibleObservation(obs),
    profile: profileInfo.profile || "unknown",
    deferred: profileInfo.deferred,
    unsupported: profileInfo.unsupported,
    hasCategoryHint: Boolean(
      asString(metaOf(obs).categoryHint) || explicitCategoryProfile(obs),
    ),
    brandNormalized: brand ? brand.normalizedValue : null,
    records,
  };
}

function canOwnerAnchor(owner, target) {
  if (!owner || !target) return false;
  if (MVP.has(target.profile) && target.profile === owner.profile) return true;
  if (target.profile === "unknown" && !target.hasCategoryHint) return true;
  return false;
}

function titleHitsAnchors(title, anchors) {
  if (!anchors) return false;
  if (anchors.set && anchors.cardNumber) {
    return (
      titleHasExactValue(title, anchors.set, "set") &&
      titleHasExactValue(title, anchors.cardNumber, "cardNumber")
    );
  }
  if (anchors.manufacturerStyleCode) {
    return titleHasExactValue(
      title,
      anchors.manufacturerStyleCode,
      "manufacturerStyleCode",
    );
  }
  if (anchors.manufacturerReference) {
    return titleHasExactValue(
      title,
      anchors.manufacturerReference,
      "manufacturerStyleCode",
    );
  }
  return false;
}

function profilesCompatible(left, right) {
  if (left.unsupported || right.unsupported) return false;
  if (
    MVP.has(left.profile) &&
    MVP.has(right.profile) &&
    left.profile !== right.profile
  ) {
    return false;
  }
  if (left.deferred && MVP.has(right.profile)) return false;
  if (right.deferred && MVP.has(left.profile)) return false;
  if (
    left.deferred &&
    right.deferred &&
    left.profile &&
    right.profile &&
    left.profile !== right.profile
  ) {
    return false;
  }
  return true;
}

function pairProfile(left, right) {
  if (MVP.has(left.profile) && left.profile === right.profile) return left.profile;
  if (MVP.has(left.profile) && (right.profile === "unknown" || right.deferred)) {
    return left.profile;
  }
  if (MVP.has(right.profile) && (left.profile === "unknown" || left.deferred)) {
    return right.profile;
  }
  if (left.profile === right.profile && left.profile) return left.profile;
  return "unknown";
}

module.exports = {
  extractBlockingRecords,
  titleHitsAnchors,
  canOwnerAnchor,
  profilesCompatible,
  pairProfile,
  isEligibleObservation,
  resolveCandidateProfile,
};
