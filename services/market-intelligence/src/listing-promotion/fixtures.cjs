/**
 * Listing Promotion fixtures.
 * fixture ≠ live HTTP. 호환 게이트 핀 기하를 재사용하고 CanonicalProduct만 가산한다.
 */

const {
  listing,
  PINNED_TCG,
  PINNED_EBAY,
  CARD_IDENTITY,
} = require("../listing-variant-compatibility/fixtures.cjs");

const CP_CARD = "cp_charizard_ex_gen_11_83";
const CP_SNEAKER = "cp_dunk_panda";
const CP_WATCH = "cp_rolex_126610ln";
const CP_BAG = "cp_mini_kelly_20_black";

const SNEAKER_IDENTITY = Object.freeze({
  brand: "Nike",
  manufacturerStyleCode: "DD1391-100",
});

const WATCH_IDENTITY = Object.freeze({
  brand: "Rolex",
  manufacturerReference: "126610LN",
});

const BAG_IDENTITY = Object.freeze({
  brand: "Hermes",
  model: "Mini Kelly",
  size: "20",
  color: "Black",
});

const cases = [
  {
    id: "pos-card-same-psa10-with-cp",
    expect: "PROMOTABLE",
    expectReason: "COMPATIBLE_CANONICAL_LISTING_PAIR",
    expectPromotion: true,
    left: listing({
      listingId: "l_promo_card_left",
      source: "tcgplayer",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA 10" },
      nativeAmount: "99.00",
    }),
    right: listing({
      listingId: "l_promo_card_right",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
      nativeAmount: "110.00",
    }),
  },
  {
    id: "neg-compatible-without-cp",
    expect: "INSUFFICIENT",
    expectReason: "CANONICAL_PRODUCT_REQUIRED",
    expectPromotion: false,
    expectCompat: "COMPATIBLE",
    left: listing({
      listingId: "l_card_psa_left",
      source: "tcgplayer",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA 10" },
    }),
    right: listing({
      listingId: "l_card_psa_right",
      source: "ebay",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
  },
  {
    id: "neg-card-psa10-vs-raw",
    expect: "NOT_PROMOTABLE",
    expectReason: "NOT_SAME_VARIANT",
    left: listing({
      listingId: "l_card_raw_left",
      source: "tcgplayer",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
    right: listing({
      listingId: "l_card_raw_right",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "raw" },
    }),
  },
  {
    id: "neg-card-missing-grade",
    expect: "INSUFFICIENT",
    expectReason: "VARIANT_FIELD_MISSING",
    left: listing({
      listingId: "l_card_miss_left",
      source: "tcgplayer",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
    }),
    right: listing({
      listingId: "l_card_miss_right",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
    }),
  },
  {
    id: "neg-pinned-match-without-canonical-id",
    expect: "INSUFFICIENT",
    expectReason: "IDENTITY_KEY_INCOMPLETE",
    left: PINNED_TCG,
    right: PINNED_EBAY,
  },
  {
    id: "neg-pinned-match-with-canonical-id-missing-grade",
    expect: "INSUFFICIENT",
    expectReason: "VARIANT_FIELD_MISSING",
    left: { ...PINNED_TCG, canonicalProductId: CP_CARD },
    right: { ...PINNED_EBAY, canonicalProductId: CP_CARD },
  },
  {
    id: "pos-pinned-match-with-cp-and-grade",
    expect: "PROMOTABLE",
    expectReason: "COMPATIBLE_CANONICAL_LISTING_PAIR",
    expectPromotion: true,
    left: {
      ...PINNED_TCG,
      canonicalProductId: CP_CARD,
      variants: { grade: "PSA10" },
    },
    right: {
      ...PINNED_EBAY,
      canonicalProductId: CP_CARD,
      variants: { grade: "PSA 10" },
    },
  },
  {
    id: "pos-sneaker-same-size-with-cp",
    expect: "PROMOTABLE",
    expectReason: "COMPATIBLE_CANONICAL_LISTING_PAIR",
    left: listing({
      listingId: "l_snk_size_left",
      source: "stockx",
      categoryProfile: "sneakers",
      canonicalProductId: CP_SNEAKER,
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "US 10" },
    }),
    right: listing({
      listingId: "l_snk_size_right",
      source: "ebay",
      categoryProfile: "sneakers",
      canonicalProductId: CP_SNEAKER,
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "us 10" },
    }),
  },
  {
    id: "neg-sneaker-size-mismatch-with-cp",
    expect: "NOT_PROMOTABLE",
    expectReason: "NOT_SAME_VARIANT",
    left: listing({
      listingId: "l_snk_270",
      source: "stockx",
      categoryProfile: "sneakers",
      canonicalProductId: CP_SNEAKER,
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "270" },
      imageUrl: "https://example.invalid/dunk.png",
    }),
    right: listing({
      listingId: "l_snk_280",
      source: "ebay",
      categoryProfile: "sneakers",
      canonicalProductId: CP_SNEAKER,
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "280" },
      imageUrl: "https://example.invalid/dunk.png",
    }),
  },
  {
    id: "pos-watch-condition-ignored-with-cp",
    expect: "PROMOTABLE",
    expectReason: "COMPATIBLE_CANONICAL_LISTING_PAIR",
    left: listing({
      listingId: "l_watch_new",
      source: "chrono24",
      categoryProfile: "watch",
      canonicalProductId: CP_WATCH,
      identity: { ...WATCH_IDENTITY },
      condition: "new",
    }),
    right: listing({
      listingId: "l_watch_used",
      source: "ebay",
      categoryProfile: "watch",
      canonicalProductId: CP_WATCH,
      identity: { ...WATCH_IDENTITY },
      condition: "used",
    }),
  },
  {
    id: "pos-luxury-bag-not-same-physical-with-cp",
    expect: "PROMOTABLE",
    expectReason: "COMPATIBLE_CANONICAL_LISTING_PAIR",
    expectSamePhysical: false,
    left: listing({
      listingId: "l_bag_left",
      source: "fashionphile",
      categoryProfile: "luxury_bag",
      canonicalProductId: CP_BAG,
      identity: { ...BAG_IDENTITY },
    }),
    right: listing({
      listingId: "l_bag_right",
      source: "vestiaire",
      categoryProfile: "luxury_bag",
      canonicalProductId: CP_BAG,
      identity: { ...BAG_IDENTITY },
    }),
  },
  {
    id: "neg-canonical-product-id-mismatch",
    expect: "CONFLICT",
    expectReason: "CANONICAL_PRODUCT_MISMATCH",
    left: listing({
      listingId: "l_cp_a",
      source: "stockx",
      categoryProfile: "sneakers",
      canonicalProductId: "cp_a",
      variants: { size: "10" },
    }),
    right: listing({
      listingId: "l_cp_b",
      source: "ebay",
      categoryProfile: "sneakers",
      canonicalProductId: "cp_b",
      variants: { size: "10" },
    }),
  },
  {
    id: "neg-missing-listing-id",
    expect: "INSUFFICIENT",
    expectReason: "LISTING_IDENTITY_INCOMPLETE",
    left: listing({
      listingId: "",
      source: "tcgplayer",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
    right: listing({
      listingId: "",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
  },
  {
    id: "neg-same-source",
    expect: "NOT_PROMOTABLE",
    expectReason: "SAME_SOURCE",
    left: listing({
      listingId: "l_src_a",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
    right: listing({
      listingId: "l_src_b",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
  },
  {
    id: "neg-title-only",
    expect: "INSUFFICIENT",
    expectReason: "IDENTITY_KEY_INCOMPLETE",
    left: listing({
      listingId: "l_title_left",
      source: "tcgplayer",
      title: "Charizard EX Generations 11/83",
      identity: {},
    }),
    right: listing({
      listingId: "l_title_right",
      source: "ebay",
      title: "Charizard EX Generations 11/83",
      identity: {},
    }),
  },
  {
    id: "neg-price-only",
    expect: "INSUFFICIENT",
    expectReason: "IDENTITY_KEY_INCOMPLETE",
    left: listing({
      listingId: "l_price_left",
      source: "stockx",
      categoryProfile: "sneakers",
      nativeAmount: "120.00",
      identity: {},
    }),
    right: listing({
      listingId: "l_price_right",
      source: "ebay",
      categoryProfile: "sneakers",
      nativeAmount: "120.00",
      identity: {},
    }),
  },
  {
    id: "neg-deferred-electronics",
    expect: "BLOCKED",
    expectReason: "PROFILE_DEFERRED",
    left: listing({
      listingId: "l_el_left",
      source: "amazon",
      categoryProfile: "electronics",
    }),
    right: listing({
      listingId: "l_el_right",
      source: "ebay",
      categoryProfile: "electronics",
    }),
  },
  {
    id: "neg-discovery-observation",
    expect: "INSUFFICIENT",
    expectReason: "INELIGIBLE_OBSERVATION",
    left: {
      id: "obs_promo_disc_left",
      source: "tcgplayer",
      observationPurpose: "DISCOVERY",
      sourceStatus: "SUCCESS",
      canonicalProductId: CP_CARD,
      meta: {
        categoryHint: "trading_card",
        identityHints: { ...CARD_IDENTITY, grade: "PSA10" },
      },
    },
    right: listing({
      listingId: "l_disc_right",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
  },
];

module.exports = {
  listing,
  cases,
  PINNED_TCG,
  PINNED_EBAY,
  CP_CARD,
};
