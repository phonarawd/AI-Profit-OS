/**
 * Engine §0.0 luxury_bag vertical seed (10~25 SKUs).
 * Meta = manual seed (Hermès / Chanel / Louis Vuitton …).
 * Image = Asset Master admin_r2 (§0.0.6) · Listing legs = ebay multi | admin.
 * Match keys: brand + model (+ size/color) · fuzzy-alone auto-publish 0.
 */

const { normalizeAssetMaster } = require("./asset-master.cjs");
const { resolveCapitalBand } = require("./capital-band.cjs");

const LUXURY_BAG_SEED_COUNT_LOCK = Object.freeze({
  min: 10,
  max: 25,
});

/** Brands required in Day-1 seed (Engine §0.0 table) */
const LUXURY_BAG_REQUIRED_BRANDS = Object.freeze([
  "Hermès",
  "Chanel",
  "Louis Vuitton",
]);

/**
 * @typedef {object} LuxuryBagSeedRow
 * @property {string} assetId
 * @property {string} assetLabel
 * @property {string} imageUrl
 * @property {'admin_r2'} imageSource
 * @property {string} requiredCapitalUsdt
 * @property {object} meta
 */

/** Deterministic Admin R2 public URL shape (SKU 1:1 · §0.0.6) */
function adminR2Url(assetId) {
  return `https://asset-images.r2.dev/assets/luxury_bag/${assetId}.jpg`;
}

/**
 * @param {object} p
 * @returns {LuxuryBagSeedRow}
 */
function seedBag(p) {
  const sizePart = p.size ? ` ${p.size}` : "";
  const colorPart = p.color ? ` ${p.color}` : "";
  const label = `${p.brand} ${p.model}${sizePart}${colorPart}`.trim();
  const assetId = `lb_${p.id}`;
  return Object.freeze({
    assetId,
    assetLabel: label,
    imageUrl: adminR2Url(assetId),
    imageSource: "admin_r2",
    requiredCapitalUsdt: String(p.capital),
    meta: Object.freeze({
      category: "luxury_bag",
      brand: p.brand,
      model: p.model,
      size: p.size || null,
      color: p.color || null,
      ebayQuery: p.ebay,
      listingLegs: Object.freeze(["ebay", "admin"]),
      quoteMarkets: Object.freeze(["ebay_us", "ebay_gb", "ebay_de", "ebay_au"]),
    }),
  });
}

/** @type {ReadonlyArray<LuxuryBagSeedRow>} */
const LUXURY_BAG_SEEDS = Object.freeze([
  // --- Hermès ---
  seedBag({
    id: "hermes_birkin_25_noir",
    brand: "Hermès",
    model: "Birkin",
    size: "25",
    color: "Noir",
    capital: "18500",
    ebay: "Hermes Birkin 25 Noir togo",
  }),
  seedBag({
    id: "hermes_birkin_30_gold",
    brand: "Hermès",
    model: "Birkin",
    size: "30",
    color: "Gold",
    capital: "22000",
    ebay: "Hermes Birkin 30 Gold togo",
  }),
  seedBag({
    id: "hermes_kelly_28_etoupe",
    brand: "Hermès",
    model: "Kelly",
    size: "28",
    color: "Etoupe",
    capital: "16800",
    ebay: "Hermes Kelly 28 Etoupe",
  }),
  seedBag({
    id: "hermes_constance_18_noir",
    brand: "Hermès",
    model: "Constance",
    size: "18",
    color: "Noir",
    capital: "12500",
    ebay: "Hermes Constance 18 black",
  }),
  seedBag({
    id: "hermes_evelyne_tpm",
    brand: "Hermès",
    model: "Evelyne",
    size: "TPM",
    color: "Etoupe",
    capital: "3200",
    ebay: "Hermes Evelyne TPM Etoupe",
  }),
  // --- Chanel ---
  seedBag({
    id: "chanel_classic_flap_medium_black",
    brand: "Chanel",
    model: "Classic Flap",
    size: "Medium",
    color: "Black",
    capital: "9800",
    ebay: "Chanel Classic Flap Medium black caviar",
  }),
  seedBag({
    id: "chanel_classic_flap_small_beige",
    brand: "Chanel",
    model: "Classic Flap",
    size: "Small",
    color: "Beige",
    capital: "8600",
    ebay: "Chanel Classic Flap Small beige",
  }),
  seedBag({
    id: "chanel_boy_medium_black",
    brand: "Chanel",
    model: "Boy",
    size: "Medium",
    color: "Black",
    capital: "5400",
    ebay: "Chanel Boy Bag Medium black",
  }),
  seedBag({
    id: "chanel_19_small_black",
    brand: "Chanel",
    model: "19",
    size: "Small",
    color: "Black",
    capital: "4800",
    ebay: "Chanel 19 Small black",
  }),
  seedBag({
    id: "chanel_deauville_tote",
    brand: "Chanel",
    model: "Deauville",
    size: "Large",
    color: "Navy",
    capital: "2900",
    ebay: "Chanel Deauville tote large navy",
  }),
  // --- Louis Vuitton ---
  seedBag({
    id: "lv_neverfull_mm_mono",
    brand: "Louis Vuitton",
    model: "Neverfull",
    size: "MM",
    color: "Monogram",
    capital: "1450",
    ebay: "Louis Vuitton Neverfull MM monogram",
  }),
  seedBag({
    id: "lv_speedy_30_mono",
    brand: "Louis Vuitton",
    model: "Speedy",
    size: "30",
    color: "Monogram",
    capital: "1200",
    ebay: "Louis Vuitton Speedy 30 monogram",
  }),
  seedBag({
    id: "lv_alma_bb_epi",
    brand: "Louis Vuitton",
    model: "Alma",
    size: "BB",
    color: "Epi Noir",
    capital: "1100",
    ebay: "Louis Vuitton Alma BB epi noir",
  }),
  seedBag({
    id: "lv_pochette_metis_empreinte",
    brand: "Louis Vuitton",
    model: "Pochette Metis",
    size: null,
    color: "Empreinte Noir",
    capital: "2100",
    ebay: "Louis Vuitton Pochette Metis empreinte",
  }),
  seedBag({
    id: "lv_keepall_45_mono",
    brand: "Louis Vuitton",
    model: "Keepall",
    size: "45",
    color: "Monogram",
    capital: "1800",
    ebay: "Louis Vuitton Keepall 45 monogram",
  }),
  // --- supporting refs (still Hermès/Chanel/LV family diversity) ---
  seedBag({
    id: "hermes_picotin_18_orange",
    brand: "Hermès",
    model: "Picotin",
    size: "18",
    color: "Orange",
    capital: "2800",
    ebay: "Hermes Picotin 18 orange",
  }),
  seedBag({
    id: "chanel_gabrielle_small",
    brand: "Chanel",
    model: "Gabrielle",
    size: "Small",
    color: "Black",
    capital: "3600",
    ebay: "Chanel Gabrielle Small black",
  }),
  seedBag({
    id: "lv_favorite_mm_mono",
    brand: "Louis Vuitton",
    model: "Favorite",
    size: "MM",
    color: "Monogram",
    capital: "950",
    ebay: "Louis Vuitton Favorite MM monogram",
  }),
]);

/** @returns {ReadonlyArray<LuxuryBagSeedRow>} */
function listLuxuryBagSeeds() {
  return LUXURY_BAG_SEEDS;
}

/**
 * Normalize seeds into Asset Master rows (Admin upsert shape).
 * @returns {ReturnType<typeof normalizeAssetMaster>[]}
 */
function luxuryBagSeedsAsAssetMasters() {
  return LUXURY_BAG_SEEDS.map((row) =>
    normalizeAssetMaster({
      assetId: row.assetId,
      category: "luxury_bag",
      assetLabel: row.assetLabel,
      imageUrl: row.imageUrl,
      imageSource: row.imageSource,
      imageAltKo: row.assetLabel,
      meta: {
        ...row.meta,
        requiredCapitalUsdt: row.requiredCapitalUsdt,
        capitalBand: resolveCapitalBand(row.requiredCapitalUsdt),
      },
    }),
  );
}

/** Ebay Browse search queries derived from seed (listing legs). */
function luxuryBagEbayQueries() {
  return [
    ...new Set(LUXURY_BAG_SEEDS.map((s) => s.meta.ebayQuery).filter(Boolean)),
  ];
}

/**
 * Invariants for CI · luxury-bag-vertical.
 * @returns {{ ok: boolean, fails: string[], counts: object }}
 */
function assertLuxuryBagSeedInvariants() {
  /** @type {string[]} */
  const fails = [];
  const n = LUXURY_BAG_SEEDS.length;
  if (
    n < LUXURY_BAG_SEED_COUNT_LOCK.min ||
    n > LUXURY_BAG_SEED_COUNT_LOCK.max
  ) {
    fails.push(
      `seed count ${n} outside ${LUXURY_BAG_SEED_COUNT_LOCK.min}~${LUXURY_BAG_SEED_COUNT_LOCK.max}`,
    );
  }

  const ids = new Set();
  /** @type {Record<string, number>} */
  const byBrand = {};

  for (const row of LUXURY_BAG_SEEDS) {
    if (ids.has(row.assetId)) fails.push(`duplicate assetId ${row.assetId}`);
    ids.add(row.assetId);

    if (row.imageSource !== "admin_r2") {
      fails.push(`${row.assetId}: imageSource must be admin_r2 for bag seed`);
    }
    if (!row.imageUrl.startsWith("https://")) {
      fails.push(`${row.assetId}: imageUrl must be https`);
    }
    if (!row.imageUrl.includes(`/assets/luxury_bag/${row.assetId}.`)) {
      fails.push(`${row.assetId}: imageUrl SKU path drift`);
    }
    if (!row.meta.ebayQuery) fails.push(`${row.assetId}: missing ebayQuery`);
    if (!row.meta.brand || !row.meta.model) {
      fails.push(`${row.assetId}: brand+model required`);
    }
    if (
      !Array.isArray(row.meta.listingLegs) ||
      !row.meta.listingLegs.includes("ebay") ||
      !row.meta.listingLegs.includes("admin")
    ) {
      fails.push(`${row.assetId}: listingLegs must be ebay|admin`);
    }
    if (row.meta.listingLegs?.includes("yahoo_jp")) {
      fails.push(`${row.assetId}: yahoo_jp FORBIDDEN`);
    }
    const qm = row.meta.quoteMarkets || [];
    for (const m of ["ebay_us", "ebay_gb"]) {
      if (!qm.includes(m)) {
        fails.push(`${row.assetId}: quoteMarkets missing ${m}`);
      }
    }

    byBrand[row.meta.brand] = (byBrand[row.meta.brand] || 0) + 1;

    try {
      normalizeAssetMaster({
        assetId: row.assetId,
        category: "luxury_bag",
        assetLabel: row.assetLabel,
        imageUrl: row.imageUrl,
        imageSource: row.imageSource,
        meta: row.meta,
      });
    } catch (e) {
      fails.push(
        `${row.assetId}: normalize failed ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  for (const brand of LUXURY_BAG_REQUIRED_BRANDS) {
    if (!byBrand[brand] || byBrand[brand] < 1) {
      fails.push(`required brand missing: ${brand}`);
    }
  }

  return {
    ok: fails.length === 0,
    fails,
    counts: {
      total: n,
      byBrand,
    },
  };
}

module.exports = {
  LUXURY_BAG_SEED_COUNT_LOCK,
  LUXURY_BAG_REQUIRED_BRANDS,
  LUXURY_BAG_SEEDS,
  listLuxuryBagSeeds,
  luxuryBagSeedsAsAssetMasters,
  luxuryBagEbayQueries,
  assertLuxuryBagSeedInvariants,
};
