/**
 * Identity Matching V2 fixtures A–M.
 * credential 없음. fixture ≠ live runtime proof.
 */

function obs(overrides) {
  const meta = overrides.meta || {};
  const base = {
    id: "obs_v2_fixture",
    source: "ebay",
    externalItemId: "v2|100000000001|0",
    url: "https://www.ebay.com/itm/100000000001",
    title: "Fixture title",
    imageUrl: "https://i.ebayimg.com/images/g/abc/s-l1600.jpg",
    nativeAmount: "10.00",
    nativeCurrency: "USD",
    observedAt: "2026-08-19T00:00:00.000Z",
    fetchedAt: "2026-08-19T00:00:00.000Z",
    observationPurpose: "CONFIRMATION",
    sourceStatus: "SUCCESS",
    parserVersion: "fixture.identity-matching.v2",
    displayAuthorized: false,
    meta: {
      priceKind: "listing_sale",
      priceSemantics: "native_proven",
      ...meta,
    },
  };
  return { ...base, ...overrides, meta: { ...base.meta, ...meta } };
}

const CHARIZARD_TITLE = "Pokemon Charizard EX Generations 11/83";

const cases = [
  {
    id: "A-composite-owner-vs-derived",
    expect: "MATCH",
    expectPath: "COMPOSITE_STRONG",
    left: obs({
      id: "obs_v2_a_left",
      source: "tcgplayer",
      externalItemId: "tcg-charizard-ex-gen-11-83",
      url: "https://www.tcgplayer.com/product/fixture-a",
      title: "Charizard EX — Generations 11/83",
      parserVersion: "fixture.tcgplayer.identity",
      meta: {
        brand: "Pokemon",
        categoryHint: "trading_card",
        identityHints: {
          game: "pokemon",
          set: "Generations",
          cardNumber: "11/83",
          character: "Charizard",
        },
      },
    }),
    right: obs({
      id: "obs_v2_a_right",
      externalItemId: "v2|200000000001|0",
      url: "https://www.ebay.com/itm/200000000001",
      title: CHARIZARD_TITLE,
      meta: {
        categoryHint: "Collectibles|Trading Card Games|CCGs Individual Cards",
        identityHints: { game: "pokemon" },
      },
    }),
  },
  {
    id: "B-title-derived-only",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_v2_b_left",
      title: CHARIZARD_TITLE,
    }),
    right: obs({
      id: "obs_v2_b_right",
      externalItemId: "v2|200000000002|0",
      title: CHARIZARD_TITLE,
    }),
  },
  {
    id: "C-image-only",
    expect: "INSUFFICIENT_EVIDENCE",
    imageCorroboration: true,
    allowSyntheticImageEvidence: true,
    left: obs({
      id: "obs_v2_c_left",
      title: "Photo listing one",
      imageUrl: "https://i.ebayimg.com/images/g/same/s-l1600.jpg",
    }),
    right: obs({
      id: "obs_v2_c_right",
      externalItemId: "v2|200000000003|0",
      title: "Photo listing two",
      imageUrl: "https://i.ebayimg.com/images/g/same/s-l1600.jpg",
    }),
  },
  {
    id: "D-card-number-conflict",
    expect: "CONFLICT",
    left: obs({
      id: "obs_v2_d_left",
      source: "tcgplayer",
      title: "Charizard EX Generations 11/83",
      meta: {
        categoryHint: "trading_card",
        identityHints: { game: "pokemon", set: "Generations", cardNumber: "11/83" },
      },
    }),
    right: obs({
      id: "obs_v2_d_right",
      externalItemId: "v2|200000000004|0",
      title: "Charizard EX Generations 12/83",
      meta: {
        categoryHint: "trading_card",
        identityHints: { game: "pokemon", set: "Generations", cardNumber: "12/83" },
      },
    }),
  },
  {
    id: "E-sneaker-style-conflict",
    expect: "CONFLICT",
    left: obs({
      id: "obs_v2_e_left",
      title: "Nike Dunk Low Panda DD1391-100",
      meta: {
        brand: "Nike",
        categoryHint: "sneakers",
        identityHints: { manufacturerStyleCode: "DD1391-100" },
      },
    }),
    right: obs({
      id: "obs_v2_e_right",
      externalItemId: "v2|200000000005|0",
      title: "Nike Dunk Low DD1503-101",
      meta: {
        brand: "Nike",
        categoryHint: "sneakers",
        identityHints: { manufacturerStyleCode: "DD1503-101" },
      },
    }),
  },
  {
    id: "F-fashionphile-sku-not-ebay-mpn",
    expect: "INSUFFICIENT_EVIDENCE",
    expectNotComparable: true,
    left: obs({
      id: "obs_v2_f_left",
      source: "fashionphile",
      externalItemId: "16132567925039",
      title: "Epsom Mini Kelly Sellier 20 Black",
      parserVersion: "fashionphile.public-json.1",
      meta: { brand: "Hermes", sku: "1956054" },
    }),
    right: obs({
      id: "obs_v2_f_right",
      externalItemId: "v2|200000000006|0",
      title: "Some product",
      meta: { brand: "Hermes", modelNumber: "1956054" },
    }),
  },
  {
    id: "G-derived-identifier-category-conflict",
    expect: "CONFLICT",
    left: obs({
      id: "obs_v2_g_left",
      title: "Nike Dunk Low Panda DD1391-100",
      meta: {
        brand: "Nike",
        categoryHint: "sneakers",
        identityHints: { manufacturerStyleCode: "DD1391-100" },
      },
    }),
    right: obs({
      id: "obs_v2_g_right",
      externalItemId: "v2|200000000007|0",
      title: "Random card listing DD1391-100",
      meta: {
        brand: "Nike",
        categoryHint: "trading_card",
      },
    }),
  },
  {
    id: "H-same-title-not-four-independents",
    expect: "INSUFFICIENT_EVIDENCE",
    expectSingleTitleFamily: true,
    left: obs({
      id: "obs_v2_h_left",
      source: "tcgplayer",
      title: CHARIZARD_TITLE,
      meta: {
        categoryHint: "trading_card",
        identityHints: {
          game: "pokemon",
          set: "Generations",
          cardNumber: "11/83",
          character: "Charizard",
        },
      },
    }),
    right: obs({
      id: "obs_v2_h_right",
      externalItemId: "v2|200000000008|0",
      title: CHARIZARD_TITLE,
    }),
  },
  {
    id: "I-discovery-plus-confirmation",
    expect: "INSUFFICIENT_EVIDENCE",
    expectEligible: false,
    left: obs({
      id: "obs_v2_i_left",
      source: "tcgplayer",
      observationPurpose: "DISCOVERY",
      title: "Charizard EX Generations 11/83",
      meta: {
        categoryHint: "trading_card",
        identityHints: { game: "pokemon", set: "Generations", cardNumber: "11/83" },
      },
    }),
    right: obs({
      id: "obs_v2_i_right",
      externalItemId: "v2|200000000009|0",
      observationPurpose: "CONFIRMATION",
      title: "Charizard EX Generations 11/83",
      meta: {
        categoryHint: "trading_card",
        identityHints: { game: "pokemon", set: "Generations", cardNumber: "11/83" },
      },
    }),
  },
  {
    id: "J-both-owner-set-and-number",
    expect: "MATCH",
    expectPath: "STRONG",
    left: obs({
      id: "obs_v2_j_left",
      source: "tcgplayer",
      title: "Charizard EX Generations 11/83",
      meta: {
        categoryHint: "trading_card",
        identityHints: { game: "pokemon", set: "Generations", cardNumber: "11/83" },
      },
    }),
    right: obs({
      id: "obs_v2_j_right",
      externalItemId: "v2|200000000010|0",
      title: "Charizard EX Generations 11/83 other seller",
      meta: {
        categoryHint: "trading_card",
        identityHints: { game: "pokemon", set: "Generations", cardNumber: "11/83" },
      },
    }),
  },
  {
    id: "K-gtin-exact-mpn-conflict",
    expect: "CONFLICT",
    left: obs({
      id: "obs_v2_k_left",
      title: "Acme Widget",
      meta: { brand: "Acme", modelNumber: "MPN-1", identityHints: { gtin: "0123456789012" } },
    }),
    right: obs({
      id: "obs_v2_k_right",
      externalItemId: "v2|200000000011|0",
      title: "Acme Widget",
      meta: { brand: "Acme", modelNumber: "MPN-2", identityHints: { gtin: "0123456789012" } },
    }),
  },
  {
    id: "L-ebay-ccg-taxonomy-composite",
    expect: "MATCH",
    expectPath: "COMPOSITE_STRONG",
    left: obs({
      id: "obs_v2_l_left",
      source: "tcgplayer",
      externalItemId: "tcg-example-set-4-102",
      url: "https://www.tcgplayer.com/product/fixture-l",
      title: "Example Card — Example Set 4/102",
      parserVersion: "fixture.tcgplayer.identity",
      meta: {
        identityHints: {
          game: "Example Game",
          set: "Example Set",
          cardNumber: "4/102",
        },
      },
    }),
    right: obs({
      id: "obs_v2_l_right",
      externalItemId: "v2|200000000012|0",
      url: "https://www.ebay.com/itm/200000000012",
      title: "Example Card Example Set 4/102",
      meta: {
        categoryHint: "Toys & Hobbies|Collectible Card Games|CCG Individual Cards",
      },
    }),
  },
  {
    id: "M-generic-collectible-not-trading-card",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_v2_m_left",
      source: "tcgplayer",
      externalItemId: "tcg-example-set-4-102-m",
      url: "https://www.tcgplayer.com/product/fixture-m",
      title: "Example Card — Example Set 4/102",
      parserVersion: "fixture.tcgplayer.identity",
      meta: {
        identityHints: {
          game: "Example Game",
          set: "Example Set",
          cardNumber: "4/102",
        },
      },
    }),
    right: obs({
      id: "obs_v2_m_right",
      externalItemId: "v2|200000000013|0",
      url: "https://www.ebay.com/itm/200000000013",
      title: "Example Card Example Set 4/102",
      meta: {
        categoryHint: "Collectibles|Decorative Collectibles",
      },
    }),
  },
];

module.exports = { obs, cases, CHARIZARD_TITLE };
