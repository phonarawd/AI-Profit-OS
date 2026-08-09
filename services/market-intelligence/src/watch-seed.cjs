/**
 * Engine §0.0 watch vertical seed (40~80 refs) + whale≥100k Ultra path.
 * Brands: Ultra=PP/AP · Core=Rolex/Cartier · Strong=Omega/Tudor (partial).
 * Image = Asset Master admin_r2 (§0.0.6) · Listing legs = ebay multi | admin.
 * Match keys: brand + reference (+ model) · fuzzy-alone auto-publish 0.
 * Coexistence: Day-1 catalog (card+bag+watch) must keep SEED_RATIO_LOCK
 * (micro+small ≥40% · mid ≥25% · high+whale ≤35%).
 */

const { normalizeAssetMaster } = require("./asset-master.cjs");
const {
  resolveCapitalBand,
  assertCatalogSeedRatios,
  BAND_MIN,
} = require("./capital-band.cjs");
const { cmpAmount, assertAmount } = require("./money.cjs");
const { listTradingCardSeeds } = require("./trading-card-seed.cjs");
const { listLuxuryBagSeeds } = require("./luxury-bag-seed.cjs");

const WATCH_SEED_COUNT_LOCK = Object.freeze({
  min: 40,
  max: 80,
});

/** Brands required in Day-1 seed (todo ultra-watch-whale · Engine §0.0 table) */
const WATCH_REQUIRED_BRANDS = Object.freeze([
  "Patek Philippe",
  "Audemars Piguet",
  "Rolex",
]);

/** brandTier lock (Engine 시계 브랜드 v1) */
const WATCH_BRAND_TIER = Object.freeze({
  "Patek Philippe": "ultra",
  "Audemars Piguet": "ultra",
  "Richard Mille": "ultra",
  Rolex: "core",
  Cartier: "core",
  "Vacheron Constantin": "core",
  Omega: "strong",
  Tudor: "strong",
});

/** whale path floor = capitalBand whale (≥100,000 USDT) */
const WHALE_MIN_REQUIRED_CAPITAL_USDT = BAND_MIN.whale;

/**
 * @typedef {object} WatchSeedRow
 * @property {string} assetId
 * @property {string} assetLabel
 * @property {string} imageUrl
 * @property {'admin_r2'} imageSource
 * @property {string} requiredCapitalUsdt
 * @property {object} meta
 */

/** Deterministic Admin R2 public URL shape (SKU 1:1 · §0.0.6) */
function adminR2Url(assetId) {
  return `https://asset-images.r2.dev/assets/watch/${assetId}.jpg`;
}

/**
 * @param {string} requiredCapitalUsdt
 * @returns {boolean}
 */
function isWhaleCapitalPath(requiredCapitalUsdt) {
  const c = assertAmount(String(requiredCapitalUsdt), "requiredCapitalUsdt");
  return cmpAmount(c, WHALE_MIN_REQUIRED_CAPITAL_USDT) >= 0;
}

/**
 * Ultra brand + whale capital = VIP/Ultra exposure path.
 * @param {{ meta?: { brandTier?: string }, requiredCapitalUsdt?: string }} row
 */
function isUltraWatchWhalePath(row) {
  return (
    row?.meta?.brandTier === "ultra" &&
    isWhaleCapitalPath(String(row.requiredCapitalUsdt ?? "0"))
  );
}

/**
 * @param {object} p
 * @returns {WatchSeedRow}
 */
function seedWatch(p) {
  const brandTier = WATCH_BRAND_TIER[p.brand];
  if (!brandTier) {
    throw new Error(`unknown watch brand (no tier): ${p.brand}`);
  }
  const label = p.model
    ? `${p.brand} ${p.model} ${p.reference}`
    : `${p.brand} ${p.reference}`;
  const assetId = `w_${p.id}`;
  return Object.freeze({
    assetId,
    assetLabel: label.trim(),
    imageUrl: adminR2Url(assetId),
    imageSource: "admin_r2",
    requiredCapitalUsdt: String(p.capital),
    meta: Object.freeze({
      category: "watch",
      brand: p.brand,
      reference: p.reference,
      model: p.model || null,
      brandTier,
      ebayQuery: p.ebay,
      listingLegs: Object.freeze(["ebay", "admin"]),
      quoteMarkets: Object.freeze(["ebay_us", "ebay_gb", "ebay_de", "ebay_au"]),
    }),
  });
}

/** @type {ReadonlyArray<WatchSeedRow>} */
const WATCH_SEEDS = Object.freeze([
  // --- Strong · small (소액 공존 · Omega/Tudor) ---
  seedWatch({
    id: "omega_seamaster_21030422001001",
    brand: "Omega",
    model: "Seamaster Diver 300M",
    reference: "210.30.42.20.01.001",
    capital: "420",
    ebay: "Omega Seamaster 210.30.42.20.01.001",
  }),
  seedWatch({
    id: "omega_speedmaster_31130423001005",
    brand: "Omega",
    model: "Speedmaster Moonwatch",
    reference: "311.30.42.30.01.005",
    capital: "520",
    ebay: "Omega Speedmaster 311.30.42.30.01.005",
  }),
  seedWatch({
    id: "omega_aqua_22010412103001",
    brand: "Omega",
    model: "Aqua Terra",
    reference: "220.10.41.21.03.001",
    capital: "380",
    ebay: "Omega Aqua Terra 220.10.41.21.03.001",
  }),
  seedWatch({
    id: "omega_constellation_13110292102001",
    brand: "Omega",
    model: "Constellation",
    reference: "131.10.29.20.02.001",
    capital: "290",
    ebay: "Omega Constellation 131.10.29.20.02.001",
  }),
  seedWatch({
    id: "omega_seamaster_21022422003001",
    brand: "Omega",
    model: "Seamaster Diver 300M",
    reference: "210.22.42.20.03.001",
    capital: "480",
    ebay: "Omega Seamaster 210.22.42.20.03.001",
  }),
  seedWatch({
    id: "omega_speedmaster_31030425001002",
    brand: "Omega",
    model: "Speedmaster Moonwatch",
    reference: "310.30.42.50.01.002",
    capital: "610",
    ebay: "Omega Speedmaster 310.30.42.50.01.002",
  }),
  seedWatch({
    id: "omega_de_ville_42413402001001",
    brand: "Omega",
    model: "De Ville Prestige",
    reference: "424.13.40.20.01.001",
    capital: "240",
    ebay: "Omega De Ville 424.13.40.20.01.001",
  }),
  seedWatch({
    id: "omega_planet_23230422101001",
    brand: "Omega",
    model: "Planet Ocean",
    reference: "232.30.42.21.01.001",
    capital: "450",
    ebay: "Omega Planet Ocean 232.30.42.21.01.001",
  }),
  seedWatch({
    id: "tudor_bb58_79030n",
    brand: "Tudor",
    model: "Black Bay 58",
    reference: "79030N",
    capital: "280",
    ebay: "Tudor Black Bay 58 79030N",
  }),
  seedWatch({
    id: "tudor_bb_79230n",
    brand: "Tudor",
    model: "Black Bay",
    reference: "79230N",
    capital: "260",
    ebay: "Tudor Black Bay 79230N",
  }),
  seedWatch({
    id: "tudor_bb_gmt_79830rb",
    brand: "Tudor",
    model: "Black Bay GMT",
    reference: "79830RB",
    capital: "320",
    ebay: "Tudor Black Bay GMT 79830RB",
  }),
  seedWatch({
    id: "tudor_pelagos_25600tn",
    brand: "Tudor",
    model: "Pelagos",
    reference: "25600TN",
    capital: "310",
    ebay: "Tudor Pelagos 25600TN",
  }),
  seedWatch({
    id: "tudor_bb41_7941a1a0nu",
    brand: "Tudor",
    model: "Black Bay 41",
    reference: "7941A1A0NU",
    capital: "270",
    ebay: "Tudor Black Bay 41 7941A1A0NU",
  }),
  seedWatch({
    id: "omega_seamaster_2254_50",
    brand: "Omega",
    model: "Seamaster 300M",
    reference: "2254.50",
    capital: "350",
    ebay: "Omega Seamaster 2254.50",
  }),
  seedWatch({
    id: "omega_speedmaster_3570_50",
    brand: "Omega",
    model: "Speedmaster Professional",
    reference: "3570.50",
    capital: "490",
    ebay: "Omega Speedmaster 3570.50",
  }),
  seedWatch({
    id: "tudor_ranger_79950",
    brand: "Tudor",
    model: "Ranger",
    reference: "79950",
    capital: "230",
    ebay: "Tudor Ranger 79950",
  }),
  seedWatch({
    id: "omega_aqua_23110422103001",
    brand: "Omega",
    model: "Aqua Terra",
    reference: "231.10.42.21.03.001",
    capital: "360",
    ebay: "Omega Aqua Terra 231.10.42.21.03.001",
  }),
  seedWatch({
    id: "tudor_bb58_bronze_79012m",
    brand: "Tudor",
    model: "Black Bay Bronze",
    reference: "79012M",
    capital: "340",
    ebay: "Tudor Black Bay Bronze 79012M",
  }),
  seedWatch({
    id: "omega_constellation_12310382102001",
    brand: "Omega",
    model: "Constellation",
    reference: "123.10.38.21.02.001",
    capital: "210",
    ebay: "Omega Constellation 123.10.38.21.02.001",
  }),
  seedWatch({
    id: "tudor_royal_28600",
    brand: "Tudor",
    model: "Royal",
    reference: "28600",
    capital: "190",
    ebay: "Tudor Royal 28600",
  }),

  // --- Core · mid (Rolex entry · Cartier) ---
  seedWatch({
    id: "rolex_sub_126610ln",
    brand: "Rolex",
    model: "Submariner",
    reference: "126610LN",
    capital: "9500",
    ebay: "Rolex Submariner 126610LN",
  }),
  seedWatch({
    id: "rolex_datejust_126334",
    brand: "Rolex",
    model: "Datejust 41",
    reference: "126334",
    capital: "8200",
    ebay: "Rolex Datejust 126334",
  }),
  seedWatch({
    id: "rolex_oyster_124300",
    brand: "Rolex",
    model: "Oyster Perpetual 41",
    reference: "124300",
    capital: "6800",
    ebay: "Rolex Oyster Perpetual 124300",
  }),
  seedWatch({
    id: "rolex_explorer_124270",
    brand: "Rolex",
    model: "Explorer",
    reference: "124270",
    capital: "7200",
    ebay: "Rolex Explorer 124270",
  }),
  seedWatch({
    id: "rolex_gmt_126710blnr",
    brand: "Rolex",
    model: "GMT-Master II",
    reference: "126710BLNR",
    capital: "9800",
    ebay: "Rolex GMT-Master II 126710BLNR",
  }),
  seedWatch({
    id: "rolex_datejust_126200",
    brand: "Rolex",
    model: "Datejust 36",
    reference: "126200",
    capital: "7500",
    ebay: "Rolex Datejust 126200",
  }),
  seedWatch({
    id: "rolex_airking_126900",
    brand: "Rolex",
    model: "Air-King",
    reference: "126900",
    capital: "6900",
    ebay: "Rolex Air-King 126900",
  }),
  seedWatch({
    id: "rolex_sub_124060",
    brand: "Rolex",
    model: "Submariner",
    reference: "124060",
    capital: "9100",
    ebay: "Rolex Submariner 124060",
  }),
  seedWatch({
    id: "cartier_santos_wssa0029",
    brand: "Cartier",
    model: "Santos de Cartier",
    reference: "WSSA0029",
    capital: "5400",
    ebay: "Cartier Santos WSSA0029",
  }),
  seedWatch({
    id: "cartier_tank_wsta0041",
    brand: "Cartier",
    model: "Tank Must",
    reference: "WSTA0041",
    capital: "2800",
    ebay: "Cartier Tank Must WSTA0041",
  }),
  seedWatch({
    id: "cartier_ballon_wsbb0048",
    brand: "Cartier",
    model: "Ballon Bleu",
    reference: "WSBB0048",
    capital: "4600",
    ebay: "Cartier Ballon Bleu WSBB0048",
  }),
  seedWatch({
    id: "cartier_santos_wgsa0029",
    brand: "Cartier",
    model: "Santos de Cartier",
    reference: "WGSA0029",
    capital: "8900",
    ebay: "Cartier Santos WGSA0029",
  }),
  seedWatch({
    id: "rolex_yacht_226659",
    brand: "Rolex",
    model: "Yacht-Master 42",
    reference: "226659",
    capital: "9600",
    ebay: "Rolex Yacht-Master 226659",
  }),
  seedWatch({
    id: "rolex_milgauss_116400gv",
    brand: "Rolex",
    model: "Milgauss",
    reference: "116400GV",
    capital: "8800",
    ebay: "Rolex Milgauss 116400GV",
  }),
  seedWatch({
    id: "cartier_panthere_wspn0007",
    brand: "Cartier",
    model: "Panthère",
    reference: "WSPN0007",
    capital: "3900",
    ebay: "Cartier Panthere WSPN0007",
  }),
  seedWatch({
    id: "rolex_datejust_126233",
    brand: "Rolex",
    model: "Datejust 36",
    reference: "126233",
    capital: "9300",
    ebay: "Rolex Datejust 126233",
  }),

  // --- Core/Ultra · high (Rolex/Cartier 핵심 · 일부 AP) ---
  seedWatch({
    id: "rolex_daytona_116500ln",
    brand: "Rolex",
    model: "Cosmograph Daytona",
    reference: "116500LN",
    capital: "28500",
    ebay: "Rolex Daytona 116500LN",
  }),
  seedWatch({
    id: "rolex_daytona_126500ln",
    brand: "Rolex",
    model: "Cosmograph Daytona",
    reference: "126500LN",
    capital: "32000",
    ebay: "Rolex Daytona 126500LN",
  }),
  seedWatch({
    id: "rolex_sky_336934",
    brand: "Rolex",
    model: "Sky-Dweller",
    reference: "336934",
    capital: "18500",
    ebay: "Rolex Sky-Dweller 336934",
  }),
  seedWatch({
    id: "rolex_gmt_126710blro",
    brand: "Rolex",
    model: "GMT-Master II",
    reference: "126710BLRO",
    capital: "22000",
    ebay: "Rolex GMT-Master II 126710BLRO",
  }),
  seedWatch({
    id: "cartier_crash_whco0007",
    brand: "Cartier",
    model: "Crash",
    reference: "WHCO0007",
    capital: "45000",
    ebay: "Cartier Crash WHCO0007",
  }),
  seedWatch({
    id: "ap_royal_oak_15500st",
    brand: "Audemars Piguet",
    model: "Royal Oak",
    reference: "15500ST.OO.1220ST.01",
    capital: "38000",
    ebay: "Audemars Piguet Royal Oak 15500ST",
  }),
  seedWatch({
    id: "ap_royal_oak_15400st",
    brand: "Audemars Piguet",
    model: "Royal Oak",
    reference: "15400ST.OO.1220ST.01",
    capital: "42000",
    ebay: "Audemars Piguet Royal Oak 15400ST",
  }),
  seedWatch({
    id: "rolex_daytona_116518ln",
    brand: "Rolex",
    model: "Cosmograph Daytona",
    reference: "116518LN",
    capital: "52000",
    ebay: "Rolex Daytona 116518LN",
  }),

  // --- Ultra · whale ≥100k (PP/AP Ultra path) ---
  seedWatch({
    id: "pp_nautilus_5711_1a",
    brand: "Patek Philippe",
    model: "Nautilus",
    reference: "5711/1A-010",
    capital: "145000",
    ebay: "Patek Philippe Nautilus 5711/1A-010",
  }),
  seedWatch({
    id: "pp_nautilus_5740_1g",
    brand: "Patek Philippe",
    model: "Nautilus",
    reference: "5740/1G-001",
    capital: "185000",
    ebay: "Patek Philippe Nautilus 5740/1G-001",
  }),
  seedWatch({
    id: "pp_aquanaut_5167a",
    brand: "Patek Philippe",
    model: "Aquanaut",
    reference: "5167A-001",
    capital: "112000",
    ebay: "Patek Philippe Aquanaut 5167A-001",
  }),
  seedWatch({
    id: "ap_royal_oak_offshore_26470st",
    brand: "Audemars Piguet",
    model: "Royal Oak Offshore",
    reference: "26470ST.OO.A027CA.01",
    capital: "128000",
    ebay: "Audemars Piguet Royal Oak Offshore 26470ST",
  }),
]);

/** @returns {ReadonlyArray<WatchSeedRow>} */
function listWatchSeeds() {
  return WATCH_SEEDS;
}

/**
 * Normalize seeds into Asset Master rows (Admin upsert shape).
 * @returns {ReturnType<typeof normalizeAssetMaster>[]}
 */
function watchSeedsAsAssetMasters() {
  return WATCH_SEEDS.map((row) =>
    normalizeAssetMaster({
      assetId: row.assetId,
      category: "watch",
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
function watchEbayQueries() {
  return [
    ...new Set(WATCH_SEEDS.map((s) => s.meta.ebayQuery).filter(Boolean)),
  ];
}

/**
 * Day-1 full catalog rows (trading_card + luxury_bag + watch) for ratio lock.
 * @returns {Array<{ capitalBand: string, category: string, assetId: string }>}
 */
function listDay1CatalogSeedBands() {
  /** @type {Array<{ capitalBand: string, category: string, assetId: string }>} */
  const rows = [];
  for (const s of listTradingCardSeeds()) {
    rows.push({
      assetId: s.assetId,
      category: "trading_card",
      capitalBand: resolveCapitalBand(s.requiredCapitalUsdt),
    });
  }
  for (const s of listLuxuryBagSeeds()) {
    rows.push({
      assetId: s.assetId,
      category: "luxury_bag",
      capitalBand: resolveCapitalBand(s.requiredCapitalUsdt),
    });
  }
  for (const s of WATCH_SEEDS) {
    rows.push({
      assetId: s.assetId,
      category: "watch",
      capitalBand: resolveCapitalBand(s.requiredCapitalUsdt),
    });
  }
  return rows;
}

/**
 * 소액 카탈로그 공존 — combined Day-1 seeds must pass SEED_RATIO_LOCK.
 */
function assertDay1CatalogCoexistence() {
  return assertCatalogSeedRatios(listDay1CatalogSeedBands());
}

/**
 * Invariants for CI · ultra-watch-whale.
 * @returns {{ ok: boolean, fails: string[], counts: object }}
 */
function assertWatchSeedInvariants() {
  /** @type {string[]} */
  const fails = [];
  const n = WATCH_SEEDS.length;
  if (n < WATCH_SEED_COUNT_LOCK.min || n > WATCH_SEED_COUNT_LOCK.max) {
    fails.push(
      `seed count ${n} outside ${WATCH_SEED_COUNT_LOCK.min}~${WATCH_SEED_COUNT_LOCK.max}`,
    );
  }

  const ids = new Set();
  /** @type {Record<string, number>} */
  const byBrand = {};
  /** @type {Record<string, number>} */
  const byTier = { ultra: 0, core: 0, strong: 0 };
  /** @type {Record<string, number>} */
  const byBand = { micro: 0, small: 0, mid: 0, high: 0, whale: 0 };
  let whaleUltra = 0;

  for (const row of WATCH_SEEDS) {
    if (ids.has(row.assetId)) fails.push(`duplicate assetId ${row.assetId}`);
    ids.add(row.assetId);

    if (row.imageSource !== "admin_r2") {
      fails.push(`${row.assetId}: imageSource must be admin_r2 for watch seed`);
    }
    if (!row.imageUrl.startsWith("https://")) {
      fails.push(`${row.assetId}: imageUrl must be https`);
    }
    if (!row.imageUrl.includes(`/assets/watch/${row.assetId}.`)) {
      fails.push(`${row.assetId}: imageUrl SKU path drift`);
    }
    if (!row.meta.ebayQuery) fails.push(`${row.assetId}: missing ebayQuery`);
    if (!row.meta.brand || !row.meta.reference) {
      fails.push(`${row.assetId}: brand+reference required`);
    }
    if (row.meta.brandTier !== WATCH_BRAND_TIER[row.meta.brand]) {
      fails.push(`${row.assetId}: brandTier drift`);
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

    const band = resolveCapitalBand(row.requiredCapitalUsdt);
    byBand[band] = (byBand[band] || 0) + 1;
    byBrand[row.meta.brand] = (byBrand[row.meta.brand] || 0) + 1;
    byTier[row.meta.brandTier] = (byTier[row.meta.brandTier] || 0) + 1;

    if (band === "whale") {
      if (!isWhaleCapitalPath(row.requiredCapitalUsdt)) {
        fails.push(`${row.assetId}: whale band but capital < ${WHALE_MIN_REQUIRED_CAPITAL_USDT}`);
      }
      if (row.meta.brandTier !== "ultra") {
        fails.push(`${row.assetId}: whale path requires brandTier=ultra (PP/AP)`);
      }
    }
    if (isUltraWatchWhalePath(row)) whaleUltra += 1;

    try {
      normalizeAssetMaster({
        assetId: row.assetId,
        category: "watch",
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

  for (const brand of WATCH_REQUIRED_BRANDS) {
    if (!byBrand[brand] || byBrand[brand] < 1) {
      fails.push(`required brand missing: ${brand}`);
    }
  }
  if ((byTier.ultra || 0) < 3) {
    fails.push(`ultra tier seeds ${byTier.ultra || 0} < 3`);
  }
  if ((byTier.core || 0) < 8) {
    fails.push(`core tier seeds ${byTier.core || 0} < 8`);
  }
  if ((byTier.strong || 0) < 8) {
    fails.push(`strong tier seeds ${byTier.strong || 0} < 8 (소액 공존)`);
  }
  if ((byBand.whale || 0) < 3) {
    fails.push(`whale≥100k seeds ${byBand.whale || 0} < 3`);
  }
  if (whaleUltra < 3) {
    fails.push(`ultra whale path ${whaleUltra} < 3`);
  }
  // PP + AP must appear on whale path
  const whaleBrands = new Set(
    WATCH_SEEDS.filter((r) => isWhaleCapitalPath(r.requiredCapitalUsdt)).map(
      (r) => r.meta.brand,
    ),
  );
  for (const b of ["Patek Philippe", "Audemars Piguet"]) {
    if (!whaleBrands.has(b)) {
      fails.push(`whale path missing Ultra brand ${b}`);
    }
  }

  const coexist = assertDay1CatalogCoexistence();
  if (!coexist.ok) {
    for (const f of coexist.fails) {
      fails.push(`catalog coexistence: ${f}`);
    }
  }

  return {
    ok: fails.length === 0,
    fails,
    counts: {
      total: n,
      byBrand,
      byTier,
      byBand,
      whaleUltra,
      coexistence: coexist,
    },
  };
}

module.exports = {
  WATCH_SEED_COUNT_LOCK,
  WATCH_REQUIRED_BRANDS,
  WATCH_BRAND_TIER,
  WHALE_MIN_REQUIRED_CAPITAL_USDT,
  WATCH_SEEDS,
  listWatchSeeds,
  watchSeedsAsAssetMasters,
  watchEbayQueries,
  isWhaleCapitalPath,
  isUltraWatchWhalePath,
  listDay1CatalogSeedBands,
  assertDay1CatalogCoexistence,
  assertWatchSeedInvariants,
};
