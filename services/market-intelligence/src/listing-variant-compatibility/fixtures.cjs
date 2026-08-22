/**
 * Listing / Variant Compatibility fixtures.
 * fixture ≠ live HTTP. 핀 기하는 Candidate Generation과 동일 관측을 재사용한다.
 */

const {
  PINNED_TCG,
  PINNED_EBAY,
} = require("../candidate-generation/fixtures.cjs");
const { obs } = require("../identity-matching/v2/fixtures.cjs");

function listing(overrides) {
  return {
    listingId: "l_fixture",
    source: "ebay",
    categoryProfile: "trading_card",
    title: "Fixture listing",
    imageUrl: "",
    nativeAmount: "",
    identity: {},
    variants: {},
    ...overrides,
  };
}

const CARD_IDENTITY = Object.freeze({
  game: "pokemon",
  set: "Generations",
  cardNumber: "11/83",
  characterOrName: "Charizard EX",
});

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
    id: "pos-card-same-psa10",
    expect: "COMPATIBLE",
    expectReason: "SAME_VARIANT_EXACT",
    expectSameVariant: true,
    expectTradable: true,
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
    id: "pos-card-title-derived-grade",
    expect: "COMPATIBLE",
    expectReason: "SAME_VARIANT_EXACT",
    expectSameVariant: true,
    left: listing({
      listingId: "l_card_derived_left",
      source: "tcgplayer",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
    right: listing({
      listingId: "l_card_derived_right",
      source: "ebay",
      identity: { ...CARD_IDENTITY },
      variants: {},
      title: "Pokemon Charizard EX Generations 11/83 PSA 10",
    }),
  },
  {
    id: "neg-card-psa10-vs-raw",
    expect: "INCOMPATIBLE",
    expectReason: "NOT_SAME_VARIANT",
    expectSameVariant: false,
    expectTradable: false,
    left: listing({
      listingId: "l_card_raw_left",
      source: "tcgplayer",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
    right: listing({
      listingId: "l_card_raw_right",
      source: "ebay",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "raw" },
    }),
  },
  {
    id: "neg-card-missing-grade",
    expect: "INSUFFICIENT",
    expectReason: "VARIANT_FIELD_MISSING",
    expectSameCanonical: true,
    expectSameVariant: null,
    left: listing({
      listingId: "l_card_miss_left",
      source: "tcgplayer",
      identity: { ...CARD_IDENTITY },
    }),
    right: listing({
      listingId: "l_card_miss_right",
      source: "ebay",
      identity: { ...CARD_IDENTITY },
    }),
  },
  {
    id: "neg-pinned-match-without-canonical-id",
    expect: "INSUFFICIENT",
    expectReason: "IDENTITY_KEY_INCOMPLETE",
    expectSameCanonical: null,
    left: PINNED_TCG,
    right: PINNED_EBAY,
  },
  {
    id: "neg-pinned-match-with-canonical-id-missing-grade",
    expect: "INSUFFICIENT",
    expectReason: "VARIANT_FIELD_MISSING",
    expectSameCanonical: true,
    left: { ...PINNED_TCG, canonicalProductId: "cp_charizard_ex_gen_11_83" },
    right: { ...PINNED_EBAY, canonicalProductId: "cp_charizard_ex_gen_11_83" },
  },
  {
    id: "pos-sneaker-same-size",
    expect: "COMPATIBLE",
    expectReason: "SAME_VARIANT_EXACT",
    left: listing({
      listingId: "l_snk_size_left",
      source: "stockx",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "US 10" },
    }),
    right: listing({
      listingId: "l_snk_size_right",
      source: "ebay",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "us 10" },
    }),
  },
  {
    id: "neg-sneaker-size-mismatch",
    expect: "INCOMPATIBLE",
    expectReason: "NOT_SAME_VARIANT",
    expectSameCanonical: true,
    expectSameVariant: false,
    left: listing({
      listingId: "l_snk_270",
      source: "stockx",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "270" },
      imageUrl: "https://example.invalid/dunk.png",
    }),
    right: listing({
      listingId: "l_snk_280",
      source: "ebay",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "280" },
      imageUrl: "https://example.invalid/dunk.png",
    }),
  },
  {
    id: "neg-sneaker-missing-size",
    expect: "INSUFFICIENT",
    expectReason: "VARIANT_FIELD_MISSING",
    left: listing({
      listingId: "l_snk_miss_left",
      source: "stockx",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
    }),
    right: listing({
      listingId: "l_snk_miss_right",
      source: "ebay",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
    }),
  },
  {
    id: "pos-watch-condition-ignored",
    expect: "COMPATIBLE",
    expectReason: "SAME_VARIANT_EXACT",
    expectSameVariant: true,
    left: listing({
      listingId: "l_watch_new",
      source: "chrono24",
      categoryProfile: "watch",
      identity: { ...WATCH_IDENTITY },
      condition: "new",
    }),
    right: listing({
      listingId: "l_watch_used",
      source: "ebay",
      categoryProfile: "watch",
      identity: { ...WATCH_IDENTITY },
      condition: "used",
    }),
  },
  {
    id: "pos-luxury-bag-not-same-physical",
    expect: "COMPATIBLE",
    expectReason: "SAME_VARIANT_EXACT",
    expectSamePhysical: false,
    left: listing({
      listingId: "l_bag_left",
      source: "fashionphile",
      categoryProfile: "luxury_bag",
      identity: { ...BAG_IDENTITY },
    }),
    right: listing({
      listingId: "l_bag_right",
      source: "vestiaire",
      categoryProfile: "luxury_bag",
      identity: { ...BAG_IDENTITY },
    }),
  },
  {
    id: "neg-luxury-bag-size-is-identity",
    expect: "CONFLICT",
    expectReason: "IDENTITY_KEY_MISMATCH",
    expectSameCanonical: false,
    left: listing({
      listingId: "l_bag_20",
      source: "fashionphile",
      categoryProfile: "luxury_bag",
      identity: { ...BAG_IDENTITY },
    }),
    right: listing({
      listingId: "l_bag_25",
      source: "vestiaire",
      categoryProfile: "luxury_bag",
      identity: { ...BAG_IDENTITY, size: "25" },
    }),
  },
  {
    id: "pos-shared-canonical-product-id",
    expect: "COMPATIBLE",
    expectReason: "SAME_VARIANT_EXACT",
    left: listing({
      listingId: "l_cp_left",
      source: "stockx",
      categoryProfile: "sneakers",
      canonicalProductId: "cp_dunk_panda",
      identity: {},
      variants: { size: "10" },
    }),
    right: listing({
      listingId: "l_cp_right",
      source: "ebay",
      categoryProfile: "sneakers",
      canonicalProductId: "cp_dunk_panda",
      identity: {},
      variants: { size: "10" },
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
    id: "neg-same-source",
    expect: "INCOMPATIBLE",
    expectReason: "SAME_SOURCE",
    left: listing({
      listingId: "l_src_a",
      source: "ebay",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
    }),
    right: listing({
      listingId: "l_src_b",
      source: "ebay",
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
    id: "neg-profile-conflict",
    expect: "CONFLICT",
    expectReason: "PROFILE_CONFLICT",
    left: listing({
      listingId: "l_prof_snk",
      source: "stockx",
      categoryProfile: "sneakers",
      identity: { ...SNEAKER_IDENTITY },
      variants: { size: "10" },
    }),
    right: listing({
      listingId: "l_prof_watch",
      source: "chrono24",
      categoryProfile: "watch",
      identity: { ...WATCH_IDENTITY },
    }),
  },
  {
    id: "neg-discovery-observation",
    expect: "INSUFFICIENT",
    expectReason: "INELIGIBLE_OBSERVATION",
    left: obs({
      id: "obs_lvc_disc_left",
      source: "tcgplayer",
      observationPurpose: "DISCOVERY",
      sourceStatus: "SUCCESS",
      meta: {
        categoryHint: "trading_card",
        identityHints: { ...CARD_IDENTITY, grade: "PSA10" },
      },
    }),
    right: listing({
      listingId: "l_disc_right",
      source: "ebay",
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
  CARD_IDENTITY,
};
