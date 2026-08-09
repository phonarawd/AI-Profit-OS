/**
 * Engine §0.0 trading_card vertical seed (20~40 SKUs).
 * Meta = pokemontcg | ygoprodeck · Listing legs = ebay multi | admin.
 * 소액 SKU bias: micro+small majority · PSA gradeDeclared where graded.
 */

const { normalizeAssetMaster } = require("./asset-master.cjs");
const { resolveCapitalBand } = require("./capital-band.cjs");
const { catalogSourceForGame } = require("./card-match.cjs");

const TRADING_CARD_SEED_COUNT_LOCK = Object.freeze({
  min: 20,
  max: 40,
});

/** micro+small share of this vertical (소액 SKU) */
const TRADING_CARD_MICRO_SMALL_MIN_PCT = 60;

/**
 * @typedef {object} TradingCardSeedRow
 * @property {string} assetId
 * @property {string} assetLabel
 * @property {string} imageUrl
 * @property {'pokemontcg'|'ygoprodeck'} imageSource
 * @property {string} requiredCapitalUsdt
 * @property {object} meta
 */

/** @type {ReadonlyArray<TradingCardSeedRow>} */
const TRADING_CARD_SEEDS = Object.freeze([
  // --- Pokémon · micro ---
  seedPoke({
    id: "base1-58",
    name: "Pikachu",
    set: "base1",
    setName: "Base Set",
    number: "58",
    finish: "normal",
    grade: "raw",
    capital: "25",
    ebay: "Pikachu Base Set 58 pokemon card",
  }),
  seedPoke({
    id: "base1-35",
    name: "Abra",
    set: "base1",
    setName: "Base Set",
    number: "35",
    finish: "normal",
    grade: "raw",
    capital: "18",
    ebay: "Abra Base Set 35 pokemon",
  }),
  seedPoke({
    id: "sv3-25",
    name: "Charmander",
    set: "sv3",
    setName: "Obsidian Flames",
    number: "25",
    finish: "normal",
    grade: "raw",
    capital: "12",
    ebay: "Charmander Obsidian Flames 025",
  }),
  seedPoke({
    id: "sv1-25",
    name: "Pikachu",
    set: "sv1",
    setName: "Scarlet & Violet",
    number: "25",
    finish: "normal",
    grade: "raw",
    capital: "15",
    ebay: "Pikachu Scarlet Violet 025",
  }),
  seedPoke({
    id: "swsh12-25",
    name: "Pikachu",
    set: "swsh12",
    setName: "Silver Tempest",
    number: "49",
    finish: "normal",
    grade: "raw",
    capital: "20",
    ebay: "Pikachu Silver Tempest pokemon",
  }),
  seedPoke({
    id: "base4-58",
    name: "Pikachu",
    set: "base4",
    setName: "Base Set 2",
    number: "58",
    finish: "normal",
    grade: "raw",
    capital: "30",
    ebay: "Pikachu Base Set 2 58",
  }),
  seedPoke({
    id: "xy1-42",
    name: "Froakie",
    set: "xy1",
    setName: "XY",
    number: "39",
    finish: "normal",
    grade: "raw",
    capital: "14",
    ebay: "Froakie XY 039 pokemon",
  }),
  seedPoke({
    id: "sm1-27",
    name: "Rowlet",
    set: "sm1",
    setName: "Sun & Moon",
    number: "9",
    finish: "normal",
    grade: "raw",
    capital: "16",
    ebay: "Rowlet Sun Moon 009",
  }),
  // --- Pokémon · small ---
  seedPoke({
    id: "base1-4",
    name: "Charizard",
    set: "base1",
    setName: "Base Set",
    number: "4",
    finish: "holofoil",
    grade: "raw",
    capital: "450",
    ebay: "Charizard Base Set 4 holofoil",
  }),
  seedPoke({
    id: "base1-4-psa9",
    name: "Charizard",
    set: "base1",
    setName: "Base Set",
    number: "4",
    finish: "holofoil",
    grade: "PSA9",
    capital: "850",
    ebay: "PSA 9 Charizard Base Set 4",
  }),
  seedPoke({
    id: "swsh45-20",
    name: "Umbreon VMAX",
    set: "swsh45",
    setName: "Shining Fates",
    number: "95",
    finish: "holofoil",
    grade: "raw",
    capital: "220",
    ebay: "Umbreon VMAX Shining Fates",
  }),
  seedPoke({
    id: "swsh7-215",
    name: "Rayquaza VMAX",
    set: "swsh7",
    setName: "Evolving Skies",
    number: "218",
    finish: "holofoil",
    grade: "raw",
    capital: "180",
    ebay: "Rayquaza VMAX Evolving Skies alt",
  }),
  seedPoke({
    id: "sv3pt5-198",
    name: "Charizard ex",
    set: "sv3pt5",
    setName: "151",
    number: "199",
    finish: "holofoil",
    grade: "raw",
    capital: "120",
    ebay: "Charizard ex 151 special illustration",
  }),
  seedPoke({
    id: "base3-15",
    name: "Zapdos",
    set: "base3",
    setName: "Fossil",
    number: "15",
    finish: "holofoil",
    grade: "raw",
    capital: "95",
    ebay: "Zapdos Fossil 15 holofoil",
  }),
  // --- Pokémon · mid / graded ---
  seedPoke({
    id: "base1-4-psa10",
    name: "Charizard",
    set: "base1",
    setName: "Base Set",
    number: "4",
    finish: "holofoil",
    grade: "PSA10",
    capital: "4500",
    ebay: "PSA 10 Charizard Base Set 4",
  }),
  seedPoke({
    id: "swsh35-74",
    name: "Charizard VMAX",
    set: "swsh35",
    setName: "Champion's Path",
    number: "74",
    finish: "holofoil",
    grade: "PSA10",
    capital: "2800",
    ebay: "PSA 10 Charizard VMAX Champions Path",
  }),
  // --- Yu-Gi-Oh · micro ---
  seedYgo({
    id: "46986414",
    name: "Dark Magician",
    set: "LOB",
    number: "005",
    finish: "normal",
    grade: "raw",
    capital: "22",
    ebay: "Dark Magician LOB-005 yugioh",
  }),
  seedYgo({
    id: "74677422",
    name: "Red-Eyes Black Dragon",
    set: "LOB",
    number: "070",
    finish: "normal",
    grade: "raw",
    capital: "28",
    ebay: "Red-Eyes Black Dragon LOB yugioh",
  }),
  seedYgo({
    id: "89631139",
    name: "Blue-Eyes White Dragon",
    set: "LOB",
    number: "001",
    finish: "normal",
    grade: "raw",
    capital: "40",
    ebay: "Blue-Eyes White Dragon LOB-001",
  }),
  seedYgo({
    id: "70781052",
    name: "Summoned Skull",
    set: "MRD",
    number: "003",
    finish: "normal",
    grade: "raw",
    capital: "18",
    ebay: "Summoned Skull MRD yugioh",
  }),
  seedYgo({
    id: "44519536",
    name: "Exodia the Forbidden One",
    set: "LOB",
    number: "124",
    finish: "normal",
    grade: "raw",
    capital: "55",
    ebay: "Exodia the Forbidden One LOB",
  }),
  seedYgo({
    id: "33396948",
    name: "Left Arm of the Forbidden One",
    set: "LOB",
    number: "123",
    finish: "normal",
    grade: "raw",
    capital: "35",
    ebay: "Left Arm Forbidden One LOB",
  }),
  // --- Yu-Gi-Oh · small ---
  seedYgo({
    id: "89631139-1e",
    name: "Blue-Eyes White Dragon",
    set: "LOB",
    number: "001",
    finish: "first_edition",
    grade: "raw",
    capital: "320",
    ebay: "Blue-Eyes White Dragon LOB 1st edition",
  }),
  seedYgo({
    id: "46986414-psa9",
    name: "Dark Magician",
    set: "LOB",
    number: "005",
    finish: "holofoil",
    grade: "PSA9",
    capital: "480",
    ebay: "PSA 9 Dark Magician LOB-005",
  }),
  seedYgo({
    id: "38033121",
    name: "Dark Magician Girl",
    set: "MFC",
    number: "000",
    finish: "holofoil",
    grade: "raw",
    capital: "210",
    ebay: "Dark Magician Girl MFC secret",
  }),
  seedYgo({
    id: "83764718",
    name: "Monster Reborn",
    set: "LOB",
    number: "118",
    finish: "normal",
    grade: "raw",
    capital: "75",
    ebay: "Monster Reborn LOB-118",
  }),
  // --- Yu-Gi-Oh · mid ---
  seedYgo({
    id: "89631139-psa10",
    name: "Blue-Eyes White Dragon",
    set: "LOB",
    number: "001",
    finish: "holofoil",
    grade: "PSA10",
    capital: "3200",
    ebay: "PSA 10 Blue-Eyes White Dragon LOB",
  }),
  seedYgo({
    id: "46986414-psa10",
    name: "Dark Magician",
    set: "LOB",
    number: "005",
    finish: "holofoil",
    grade: "PSA10",
    capital: "2100",
    ebay: "PSA 10 Dark Magician LOB-005",
  }),
]);

/**
 * @param {object} p
 * @returns {TradingCardSeedRow}
 */
function seedPoke(p) {
  const imageUrl = `https://images.pokemontcg.io/${p.set}/${p.number}.png`;
  const label =
    p.grade && p.grade !== "raw"
      ? `${p.grade} ${p.name} ${p.setName} #${p.number}`
      : `${p.name} ${p.setName} #${p.number}`;
  return Object.freeze({
    assetId: `tc_poke_${p.id}`,
    assetLabel: label,
    imageUrl,
    imageSource: "pokemontcg",
    requiredCapitalUsdt: String(p.capital),
    meta: Object.freeze({
      category: "trading_card",
      game: "pokemon",
      catalogId: p.id,
      catalogSource: "pokemontcg",
      set: p.set,
      setName: p.setName,
      number: String(p.number),
      lang: "en",
      finish: p.finish,
      gradeDeclared: p.grade,
      ebayQuery: p.ebay,
      listingLegs: Object.freeze(["ebay", "admin"]),
      quoteMarkets: Object.freeze(["ebay_us", "ebay_gb"]),
    }),
  });
}

/**
 * @param {object} p
 * @returns {TradingCardSeedRow}
 */
function seedYgo(p) {
  const numericId = String(p.id).replace(/[^0-9].*$/, "") || p.id;
  const imageUrl = `https://images.ygoprodeck.com/images/cards_small/${numericId}.jpg`;
  const label =
    p.grade && p.grade !== "raw"
      ? `${p.grade} ${p.name} ${p.set}-${p.number}`
      : `${p.name} ${p.set}-${p.number}`;
  return Object.freeze({
    assetId: `tc_ygo_${p.id}`,
    assetLabel: label,
    imageUrl,
    imageSource: "ygoprodeck",
    requiredCapitalUsdt: String(p.capital),
    meta: Object.freeze({
      category: "trading_card",
      game: "yugioh",
      catalogId: String(numericId),
      catalogSource: "ygoprodeck",
      set: p.set,
      setName: p.set,
      number: String(p.number),
      lang: "en",
      finish: p.finish,
      gradeDeclared: p.grade,
      ebayQuery: p.ebay,
      listingLegs: Object.freeze(["ebay", "admin"]),
      quoteMarkets: Object.freeze(["ebay_us", "ebay_gb"]),
    }),
  });
}

/** @returns {ReadonlyArray<TradingCardSeedRow>} */
function listTradingCardSeeds() {
  return TRADING_CARD_SEEDS;
}

/**
 * Normalize seeds into Asset Master rows (Admin upsert shape).
 * @returns {ReturnType<typeof normalizeAssetMaster>[]}
 */
function tradingCardSeedsAsAssetMasters() {
  return TRADING_CARD_SEEDS.map((row) =>
    normalizeAssetMaster({
      assetId: row.assetId,
      category: "trading_card",
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
function tradingCardEbayQueries() {
  return [
    ...new Set(TRADING_CARD_SEEDS.map((s) => s.meta.ebayQuery).filter(Boolean)),
  ];
}

/** pokemontcg API `q` defaults aligned to seed names */
function tradingCardPokemonQueries() {
  const names = TRADING_CARD_SEEDS.filter((s) => s.meta.game === "pokemon").map(
    (s) => {
      const name = String(s.assetLabel)
        .replace(/^PSA\d+(?:\.\d+)?\s+/i, "")
        .replace(/^BGS\d+(?:\.\d+)?\s+/i, "")
        .split(/\s+/)[0];
      return `name:${name}`;
    },
  );
  return [...new Set(names)];
}

/** ygoprodeck fname defaults */
function tradingCardYugiohNames() {
  const names = TRADING_CARD_SEEDS.filter((s) => s.meta.game === "yugioh").map(
    (s) => {
      // strip grade + set suffix → card name
      let label = String(s.assetLabel);
      label = label.replace(/^(PSA|BGS|CGC|SGC)\d+(?:\.\d+)?\s+/i, "");
      label = label.replace(/\s+[A-Z0-9]+-\d+.*$/, "");
      return label.trim();
    },
  );
  return [...new Set(names)];
}

/**
 * Invariants for CI · trading-card-vertical.
 * @returns {{ ok: boolean, fails: string[], counts: object }}
 */
function assertTradingCardSeedInvariants() {
  /** @type {string[]} */
  const fails = [];
  const n = TRADING_CARD_SEEDS.length;
  if (n < TRADING_CARD_SEED_COUNT_LOCK.min || n > TRADING_CARD_SEED_COUNT_LOCK.max) {
    fails.push(
      `seed count ${n} outside ${TRADING_CARD_SEED_COUNT_LOCK.min}~${TRADING_CARD_SEED_COUNT_LOCK.max}`,
    );
  }

  const ids = new Set();
  let poke = 0;
  let ygo = 0;
  let microSmall = 0;
  let graded = 0;

  for (const row of TRADING_CARD_SEEDS) {
    if (ids.has(row.assetId)) fails.push(`duplicate assetId ${row.assetId}`);
    ids.add(row.assetId);

    if (row.imageSource !== catalogSourceForGame(row.meta.game)) {
      fails.push(`${row.assetId}: imageSource≠catalog for game`);
    }
    if (!row.meta.ebayQuery) fails.push(`${row.assetId}: missing ebayQuery`);
    if (!row.meta.set || !row.meta.number || !row.meta.lang || !row.meta.finish) {
      fails.push(`${row.assetId}: incomplete match keys`);
    }
    if (!row.meta.gradeDeclared) {
      fails.push(`${row.assetId}: gradeDeclared required (raw ok)`);
    }
    if (
      !Array.isArray(row.meta.listingLegs) ||
      !row.meta.listingLegs.includes("ebay")
    ) {
      fails.push(`${row.assetId}: listingLegs must include ebay`);
    }
    if (row.meta.listingLegs?.includes("yahoo_jp")) {
      fails.push(`${row.assetId}: yahoo_jp FORBIDDEN`);
    }

    const band = resolveCapitalBand(row.requiredCapitalUsdt);
    if (band === "micro" || band === "small") microSmall += 1;
    if (row.meta.game === "pokemon") poke += 1;
    if (row.meta.game === "yugioh") ygo += 1;
    if (row.meta.gradeDeclared && row.meta.gradeDeclared !== "raw") graded += 1;

    try {
      normalizeAssetMaster({
        assetId: row.assetId,
        category: "trading_card",
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

  if (poke < 8) fails.push(`pokemon seeds ${poke} < 8`);
  if (ygo < 8) fails.push(`yugioh seeds ${ygo} < 8`);
  if (graded < 4) fails.push(`graded SKUs ${graded} < 4 (PSA pipeline)`);

  const microSmallPct = n > 0 ? (microSmall * 100) / n : 0;
  if (microSmallPct + 1e-9 < TRADING_CARD_MICRO_SMALL_MIN_PCT) {
    fails.push(
      `소액 SKU micro+small ${microSmallPct.toFixed(1)}% < ${TRADING_CARD_MICRO_SMALL_MIN_PCT}%`,
    );
  }

  return {
    ok: fails.length === 0,
    fails,
    counts: {
      total: n,
      pokemon: poke,
      yugioh: ygo,
      microSmall,
      graded,
      microSmallPct,
    },
  };
}

module.exports = {
  TRADING_CARD_SEED_COUNT_LOCK,
  TRADING_CARD_MICRO_SMALL_MIN_PCT,
  TRADING_CARD_SEEDS,
  listTradingCardSeeds,
  tradingCardSeedsAsAssetMasters,
  tradingCardEbayQueries,
  tradingCardPokemonQueries,
  tradingCardYugiohNames,
  assertTradingCardSeedInvariants,
};
