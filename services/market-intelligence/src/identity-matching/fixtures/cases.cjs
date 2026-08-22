/**
 * Sanitized Identity Matching V1 fixtures.
 * credential / cookie / token 없음. fixture ≠ live runtime proof.
 */

function obs(overrides) {
  const meta = overrides.meta || {};
  const base = {
    id: "obs_fixture",
    source: "ebay",
    externalItemId: "v1|100000000001|0",
    url: "https://www.ebay.com/itm/100000000001",
    title: "Fixture title",
    imageUrl: "https://i.ebayimg.com/images/g/abc/s-l1600.jpg",
    nativeAmount: "10.00",
    nativeCurrency: "USD",
    observedAt: "2026-08-19T00:00:00.000Z",
    fetchedAt: "2026-08-19T00:00:00.000Z",
    observationPurpose: "CONFIRMATION",
    sourceStatus: "SUCCESS",
    parserVersion: "ebay.browse-api.1",
    displayAuthorized: false,
    meta: {
      priceKind: "listing_sale",
      priceSemantics: "native_proven",
      ...meta,
    },
  };
  return { ...base, ...overrides, meta: { ...base.meta, ...meta } };
}

const BAG_CATEGORY = "Clothing, Shoes & Accessories|Women|Women's Bags & Handbags";

const cases = [
  {
    id: "A-strong-gtin",
    expect: "MATCH",
    left: obs({
      id: "obs_a_left",
      externalItemId: "v1|111|0",
      title: "Acme Widget",
      meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
    }),
    right: obs({
      id: "obs_a_right",
      externalItemId: "v1|222|0",
      url: "https://www.ebay.com/itm/222",
      title: "Acme Widget other seller",
      meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
    }),
  },
  {
    id: "B-mpn-mismatch-no-match",
    expect: "NO_MATCH",
    left: obs({
      id: "obs_b_left",
      externalItemId: "v1|301|0",
      title: "Acme Pump",
      meta: { brand: "Acme", modelNumber: "MPN-A" },
    }),
    right: obs({
      id: "obs_b_right",
      externalItemId: "v1|302|0",
      title: "Acme Pump similar",
      meta: { brand: "Acme", modelNumber: "MPN-B" },
    }),
  },
  {
    id: "C-title-only",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_c_left",
      title: "Hermes Mini Kelly Sellier 20 Black Epsom",
    }),
    right: obs({
      id: "obs_c_right",
      externalItemId: "v1|303|0",
      title: "Hermes Mini Kelly Sellier 20 Black Epsom Leather",
    }),
  },
  {
    id: "D-brand-only",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_d_left",
      source: "fashionphile",
      externalItemId: "16132567925039",
      title: "Epsom Mini Kelly Sellier 20 Black",
      parserVersion: "fashionphile.public-json.1",
      meta: { brand: "Hermes", sku: "1956054" },
    }),
    right: obs({
      id: "obs_d_right",
      externalItemId: "v1|304|0",
      title: "Hermes scarf",
      meta: { brand: "HERMÈS" },
    }),
  },
  {
    id: "E-variant-size-mismatch",
    expect: "NO_MATCH",
    left: obs({
      id: "obs_e_left",
      title: "Gucci Dionysus",
      meta: {
        brand: "Gucci",
        model: "Dionysus",
        size: "Small",
        categoryHint: BAG_CATEGORY,
      },
    }),
    right: obs({
      id: "obs_e_right",
      externalItemId: "v1|305|0",
      title: "Gucci Dionysus",
      meta: {
        brand: "Gucci",
        model: "Dionysus",
        size: "Medium",
        categoryHint: BAG_CATEGORY,
      },
    }),
  },
  {
    id: "F-external-item-id-namespace",
    expect: "MATCH",
    left: obs({
      id: "obs_f_left",
      source: "fashionphile",
      externalItemId: "999000111",
      title: "Acme Widget",
      parserVersion: "fashionphile.public-json.1",
      meta: { brand: "Acme", sku: "LOCAL-1", identityHints: { gtin: "0123456789012" } },
    }),
    right: obs({
      id: "obs_f_right",
      externalItemId: "v1|777|0",
      title: "Acme Widget",
      meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
    }),
  },
  {
    id: "G-missing-identity",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_g_left",
      title: "Unknown product",
    }),
    right: obs({
      id: "obs_g_right",
      externalItemId: "v1|306|0",
      title: "Acme Widget",
      meta: { brand: "Acme", modelNumber: "MPN-9", identityHints: { gtin: "0123456789012" } },
    }),
  },
  {
    id: "H-strong-positive-and-negative-conflict",
    expect: "CONFLICT",
    left: obs({
      id: "obs_h_left",
      title: "Acme Widget",
      meta: { brand: "Acme", modelNumber: "MPN-1", identityHints: { gtin: "0123456789012" } },
    }),
    right: obs({
      id: "obs_h_right",
      externalItemId: "v1|307|0",
      title: "Acme Widget",
      meta: { brand: "Acme", modelNumber: "MPN-2", identityHints: { gtin: "0123456789012" } },
    }),
  },
  {
    id: "I-image-only",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_i_left",
      title: "Photo listing one",
      imageUrl: "https://i.ebayimg.com/images/g/same/s-l1600.jpg",
    }),
    right: obs({
      id: "obs_i_right",
      externalItemId: "v1|308|0",
      title: "Photo listing two",
      imageUrl: "https://i.ebayimg.com/images/g/same/s-l1600.jpg",
    }),
  },
  {
    id: "J-discovery-not-eligible",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_j_left",
      observationPurpose: "DISCOVERY",
      title: "Acme Widget",
      meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
    }),
    right: obs({
      id: "obs_j_right",
      externalItemId: "v1|309|0",
      observationPurpose: "DISCOVERY",
      title: "Acme Widget",
      meta: { brand: "Acme", identityHints: { gtin: "0123456789012" } },
    }),
    expectEligible: false,
  },
  {
    id: "K-fashionphile-sku-not-ebay-mpn",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_k_left",
      source: "fashionphile",
      externalItemId: "16132567925039",
      title: "Epsom Mini Kelly Sellier 20 Black",
      parserVersion: "fashionphile.public-json.1",
      meta: { brand: "Hermes", sku: "1956054" },
    }),
    right: obs({
      id: "obs_k_right",
      externalItemId: "v1|310|0",
      title: "Some product",
      meta: { brand: "Hermes", modelNumber: "1956054" },
    }),
  },
  {
    id: "L-raw-model-number-type-mismatch",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_l_left",
      title: "Rolex Submariner",
      meta: { brand: "Rolex", modelNumber: "1680" },
    }),
    right: obs({
      id: "obs_l_right",
      source: "chrono24",
      externalItemId: "46423475",
      url: "https://www.chrono24.com/rolex/submariner-date--id46423475.htm",
      title: "Rolex Submariner Date",
      imageUrl: "https://img.chrono24.com/images/uhren/46423475-sanitized-primary.jpg",
      parserVersion: "chrono24.structured-data.1",
      meta: { brand: "Rolex", model: "Submariner Date", modelNumber: "1680" },
    }),
  },
  {
    id: "M-watch-brand-plus-reference",
    expect: "MATCH",
    left: obs({
      id: "obs_m_left",
      source: "chrono24",
      externalItemId: "46423475",
      url: "https://www.chrono24.com/rolex/submariner-date--id46423475.htm",
      title: "Rolex Submariner Date",
      imageUrl: "https://img.chrono24.com/images/uhren/46423475-sanitized-primary.jpg",
      parserVersion: "chrono24.structured-data.1",
      meta: { brand: "Rolex", model: "Submariner Date", modelNumber: "1680" },
    }),
    right: obs({
      id: "obs_m_right",
      source: "chrono24",
      externalItemId: "55500001",
      url: "https://www.chrono24.com/rolex/submariner-date--id55500001.htm",
      title: "Rolex Submariner Date 1680",
      imageUrl: "https://img.chrono24.com/images/uhren/55500001-sanitized-primary.jpg",
      parserVersion: "chrono24.structured-data.1",
      meta: { brand: "Rolex", model: "Submariner Date", modelNumber: "1680" },
    }),
  },
  {
    id: "N-watch-reference-mismatch",
    expect: "NO_MATCH",
    left: obs({
      id: "obs_n_left",
      source: "chrono24",
      externalItemId: "46423475",
      url: "https://www.chrono24.com/rolex/submariner-date--id46423475.htm",
      title: "Rolex Submariner Date",
      imageUrl: "https://img.chrono24.com/images/uhren/46423475-sanitized-primary.jpg",
      parserVersion: "chrono24.structured-data.1",
      meta: { brand: "Rolex", model: "Submariner Date", modelNumber: "1680" },
    }),
    right: obs({
      id: "obs_n_right",
      source: "chrono24",
      externalItemId: "55500002",
      url: "https://www.chrono24.com/rolex/submariner-date--id55500002.htm",
      title: "Rolex Submariner Date",
      imageUrl: "https://img.chrono24.com/images/uhren/55500002-sanitized-primary.jpg",
      parserVersion: "chrono24.structured-data.1",
      meta: { brand: "Rolex", model: "Submariner Date", modelNumber: "16610" },
    }),
  },
  {
    id: "O-gtin-does-not-apply-not-strong",
    expect: "INSUFFICIENT_EVIDENCE",
    left: obs({
      id: "obs_o_left",
      title: "Hermes Mini Kelly",
      meta: { brand: "Hermes", identityHints: { gtin: "Does Not Apply" } },
    }),
    right: obs({
      id: "obs_o_right",
      externalItemId: "v1|311|0",
      title: "Hermes Mini Kelly",
      meta: { brand: "HERMÈS", identityHints: { gtin: "Does Not Apply" } },
    }),
  },
  {
    id: "P-fashion-corroborating-match",
    expect: "MATCH",
    left: obs({
      id: "obs_p_left",
      title: "Gucci Dionysus Small",
      meta: {
        brand: "Gucci",
        model: "Dionysus",
        size: "Small",
        categoryHint: BAG_CATEGORY,
        identityHints: { color: "Black" },
      },
    }),
    right: obs({
      id: "obs_p_right",
      externalItemId: "v1|312|0",
      title: "Gucci Dionysus",
      meta: {
        brand: "Gucci",
        model: "Dionysus",
        size: "Small",
        categoryHint: BAG_CATEGORY,
        identityHints: { color: "Black" },
      },
    }),
  },
];

module.exports = { obs, cases };
