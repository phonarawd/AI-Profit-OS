/**
 * Candidate Generation fixtures.
 * fixture ≠ live HTTP. 핀 기하만 재현한다.
 */

const { obs, cases: v2Cases, CHARIZARD_TITLE } = require("../identity-matching/v2/fixtures.cjs");

function byId(id) {
  return v2Cases.find((row) => row.id === id);
}

const PINNED_TCG = {
  id: "obs_v2_live_tcg_113669",
  source: "tcgplayer",
  externalItemId: "113669",
  url: "https://www.tcgplayer.com/product/113669/pokemon-generations-charizard-ex",
  title: "Charizard EX - Generations (GEN)",
  imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/113669_in_200x200.jpg",
  observedAt: "2026-08-19T12:00:00.000Z",
  fetchedAt: "2026-08-19T12:00:00.000Z",
  observationPurpose: "CONFIRMATION",
  sourceStatus: "SUCCESS",
  parserVersion: "validation.tcgplayer.live-manual.1",
  displayAuthorized: false,
  nativeAmount: "99.00",
  nativeCurrency: "USD",
  meta: {
    observationMode: "PINNED_GEOMETRY",
    identityHints: {
      game: "Pokémon",
      set: "Generations",
      cardNumber: "11/83",
      character: "Charizard EX",
    },
  },
};

const PINNED_EBAY = obs({
  id: "obs_v2_live_ebay_377416817781",
  source: "ebay",
  externalItemId: "377416817781",
  url: "https://www.ebay.com/itm/377416817781",
  title: CHARIZARD_TITLE,
  nativeAmount: "99.00",
  nativeCurrency: "USD",
  meta: {
    categoryHint: "Toys & Hobbies|Collectible Card Games|CCG Individual Cards",
    identityHints: { game: "pokemon" },
  },
});

const cases = [
  {
    id: "pos-composite-owner-vs-derived",
    expectCount: 1,
    expectPair: ["obs_v2_a_left", "obs_v2_a_right"],
    expectMatchDecision: "MATCH",
    observations: [byId("A-composite-owner-vs-derived").left, byId("A-composite-owner-vs-derived").right],
  },
  {
    id: "pos-both-owner-set-number",
    expectCount: 1,
    expectPair: ["obs_v2_j_left", "obs_v2_j_right"],
    expectMatchDecision: "MATCH",
    observations: [byId("J-both-owner-set-and-number").left, byId("J-both-owner-set-and-number").right],
  },
  {
    id: "pos-ebay-ccg-taxonomy",
    expectCount: 1,
    expectPair: ["obs_v2_l_left", "obs_v2_l_right"],
    expectMatchDecision: "MATCH",
    observations: [byId("L-ebay-ccg-taxonomy-composite").left, byId("L-ebay-ccg-taxonomy-composite").right],
  },
  {
    id: "pos-candidate-not-match-truth",
    expectCount: 1,
    expectPair: ["obs_v2_h_left", "obs_v2_h_right"],
    expectMatchDecision: "INSUFFICIENT_EVIDENCE",
    observations: [byId("H-same-title-not-four-independents").left, byId("H-same-title-not-four-independents").right],
  },
  {
    id: "pos-pinned-real-pair-geometry",
    expectCount: 1,
    expectPair: ["obs_v2_live_tcg_113669", "obs_v2_live_ebay_377416817781"],
    observations: [PINNED_TCG, PINNED_EBAY],
  },
  {
    id: "pos-gtin-cross-source",
    expectCount: 1,
    expectPair: ["obs_cg_gtin_left", "obs_cg_gtin_right"],
    observations: [
      obs({
        id: "obs_cg_gtin_left",
        source: "stockx",
        externalItemId: "stockx-gtin-1",
        title: "Acme Widget StockX",
        meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
      }),
      obs({
        id: "obs_cg_gtin_right",
        source: "ebay",
        externalItemId: "v2|300000000001|0",
        title: "Acme Widget eBay",
        meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
      }),
    ],
  },
  {
    id: "pos-sneaker-style-cross-source",
    expectCount: 1,
    expectPair: ["obs_cg_snk_left", "obs_cg_snk_right"],
    observations: [
      obs({
        id: "obs_cg_snk_left",
        source: "stockx",
        externalItemId: "stockx-dunk-panda",
        title: "Nike Dunk Low Panda",
        meta: {
          brand: "Nike",
          categoryHint: "sneakers",
          identityHints: { manufacturerStyleCode: "DD1391-100" },
        },
      }),
      obs({
        id: "obs_cg_snk_right",
        source: "ebay",
        externalItemId: "v2|300000000002|0",
        title: "Nike Dunk Low Panda DD1391-100",
        meta: { brand: "Nike", categoryHint: "sneakers" },
      }),
    ],
  },
  {
    id: "pos-watch-reference-not-mpn",
    expectCount: 1,
    expectPair: ["obs_cg_watch_left", "obs_cg_watch_right"],
    observations: [
      obs({
        id: "obs_cg_watch_left",
        source: "chrono24",
        externalItemId: "chrono-126610ln",
        title: "Rolex Submariner 126610LN",
        meta: {
          brand: "Rolex",
          modelNumber: "126610LN",
          categoryHint: "Wristwatches",
        },
      }),
      obs({
        id: "obs_cg_watch_right",
        source: "ebay",
        externalItemId: "v2|300000000003|0",
        title: "Rolex Submariner Date 126610LN",
        meta: {
          brand: "Rolex",
          categoryHint: "Wristwatches",
          identityHints: { manufacturerReference: "126610LN" },
        },
      }),
    ],
  },
  {
    id: "pos-luxury-bag-full-identity",
    expectCount: 1,
    expectPair: ["obs_cg_bag_left", "obs_cg_bag_right"],
    observations: [
      obs({
        id: "obs_cg_bag_left",
        source: "fashionphile",
        externalItemId: "fp-mini-kelly",
        title: "Hermes Mini Kelly",
        meta: {
          brand: "Hermes",
          model: "Mini Kelly",
          size: "20",
          categoryHint: "luxury bag",
          identityHints: { color: "Black" },
        },
      }),
      obs({
        id: "obs_cg_bag_right",
        source: "vestiaire",
        externalItemId: "vc-mini-kelly",
        title: "Hermes Mini Kelly 20 Black",
        meta: {
          brand: "Hermes",
          model: "Mini Kelly",
          size: "20",
          categoryHint: "luxury bag",
          identityHints: { color: "Black" },
        },
      }),
    ],
  },
  {
    id: "neg-title-only-cross-source",
    expectCount: 0,
    observations: [
      obs({
        id: "obs_cg_title_left",
        source: "tcgplayer",
        title: CHARIZARD_TITLE,
        meta: { categoryHint: "trading_card" },
      }),
      obs({
        id: "obs_cg_title_right",
        source: "ebay",
        externalItemId: "v2|300000000010|0",
        title: CHARIZARD_TITLE,
        meta: { categoryHint: "trading_card" },
      }),
    ],
  },
  {
    id: "neg-image-only-cross-source",
    expectCount: 0,
    observations: [
      obs({
        id: "obs_cg_img_left",
        source: "tcgplayer",
        title: "Photo listing one",
        imageUrl: "https://i.ebayimg.com/images/g/same/s-l1600.jpg",
      }),
      obs({
        id: "obs_cg_img_right",
        source: "ebay",
        externalItemId: "v2|300000000011|0",
        title: "Photo listing two",
        imageUrl: "https://i.ebayimg.com/images/g/same/s-l1600.jpg",
      }),
    ],
  },
  {
    id: "neg-price-only-cross-source",
    expectCount: 0,
    observations: [
      obs({
        id: "obs_cg_price_left",
        source: "tcgplayer",
        title: "Unrelated left",
        nativeAmount: "42.00",
      }),
      obs({
        id: "obs_cg_price_right",
        source: "ebay",
        externalItemId: "v2|300000000012|0",
        title: "Unrelated right",
        nativeAmount: "42.00",
      }),
    ],
  },
  {
    id: "neg-fashionphile-sku-not-ebay-mpn",
    expectCount: 0,
    observations: [byId("F-fashionphile-sku-not-ebay-mpn").left, byId("F-fashionphile-sku-not-ebay-mpn").right],
  },
  {
    id: "neg-discovery-not-eligible",
    expectCount: 0,
    observations: [byId("I-discovery-plus-confirmation").left, byId("I-discovery-plus-confirmation").right],
  },
  {
    id: "neg-category-conflict",
    expectCount: 0,
    observations: [byId("G-derived-identifier-category-conflict").left, byId("G-derived-identifier-category-conflict").right],
  },
  {
    id: "neg-card-number-mismatch",
    expectCount: 0,
    observations: [byId("D-card-number-conflict").left, byId("D-card-number-conflict").right],
  },
  {
    id: "neg-decorative-collectible",
    expectCount: 0,
    observations: [byId("M-generic-collectible-not-trading-card").left, byId("M-generic-collectible-not-trading-card").right],
  },
  {
    id: "neg-same-source-gtin",
    expectCount: 0,
    observations: [
      obs({
        id: "obs_cg_same_src_a",
        source: "ebay",
        externalItemId: "v2|300000000020|0",
        title: "Acme A",
        meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
      }),
      obs({
        id: "obs_cg_same_src_b",
        source: "ebay",
        externalItemId: "v2|300000000021|0",
        title: "Acme B",
        meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
      }),
    ],
  },
  {
    id: "neg-watch-reference-not-ebay-mpn",
    expectCount: 0,
    observations: [
      obs({
        id: "obs_cg_watch_mpn_left",
        source: "chrono24",
        externalItemId: "chrono-126610ln-mpn",
        title: "Rolex Submariner 126610LN",
        meta: {
          brand: "Rolex",
          modelNumber: "126610LN",
          categoryHint: "Wristwatches",
        },
      }),
      obs({
        id: "obs_cg_watch_mpn_right",
        source: "ebay",
        externalItemId: "v2|300000000022|0",
        title: "Rolex Submariner Date",
        meta: {
          brand: "Rolex",
          modelNumber: "126610LN",
          categoryHint: "Wristwatches",
        },
      }),
    ],
  },
  {
    id: "neg-deferred-electronics-no-native-plugin",
    expectCount: 0,
    observations: [
      obs({
        id: "obs_cg_elec_left",
        source: "stockx",
        title: "Phone A",
        meta: {
          brand: "Acme",
          identityHints: { categoryProfile: "electronics", manufacturerStyleCode: "PH-1" },
        },
      }),
      obs({
        id: "obs_cg_elec_right",
        source: "ebay",
        externalItemId: "v2|300000000023|0",
        title: "Phone B PH-1",
        meta: {
          brand: "Acme",
          identityHints: { categoryProfile: "electronics" },
        },
      }),
    ],
  },
];

const mixedPool = {
  id: "mixed-pool-only-real-blocking-pairs",
  observations: [
    byId("A-composite-owner-vs-derived").left,
    byId("A-composite-owner-vs-derived").right,
    obs({
      id: "obs_cg_mixed_title_left",
      source: "ebay",
      title: "Random promo listing one",
    }),
    obs({
      id: "obs_cg_mixed_title_right",
      source: "tcgplayer",
      title: "Random promo listing two",
    }),
    byId("C-image-only").left,
    byId("C-image-only").right,
    byId("F-fashionphile-sku-not-ebay-mpn").left,
    byId("F-fashionphile-sku-not-ebay-mpn").right,
    obs({
      id: "obs_cg_decoy_price",
      source: "chrono24",
      title: "Unrelated decoy",
      nativeAmount: "10.00",
      imageUrl: "https://i.ebayimg.com/images/g/abc/s-l1600.jpg",
    }),
  ],
  expectPairs: [["obs_v2_a_left", "obs_v2_a_right"]],
};

module.exports = {
  cases,
  mixedPool,
  PINNED_TCG,
  PINNED_EBAY,
  CHARIZARD_TITLE,
};
