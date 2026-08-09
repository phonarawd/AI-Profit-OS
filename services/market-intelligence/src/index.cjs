/**
 * @aipo/market-intelligence — Engine §0.0 public surface
 */

const money = require("./money.cjs");
const markets = require("./markets.cjs");
const forbidden = require("./forbidden.cjs");
const pipeline = require("./pipeline.cjs");
const pricing = require("./pricing-formula.cjs");
const fx = require("./fx-snapshot-formula.cjs");
const capitalBand = require("./capital-band.cjs");
const assetMaster = require("./asset-master.cjs");
const assetImage = require("./asset-image.cjs");
const adapters = require("./adapters.cjs");
const marketPartners = require("./market-partners.cjs");
const cardGrade = require("./card-grade.cjs");

const cardMatch = require("./card-match.cjs");
const tradingCardSeed = require("./trading-card-seed.cjs");
const bagMatch = require("./bag-match.cjs");
const luxuryBagSeed = require("./luxury-bag-seed.cjs");
const watchMatch = require("./watch-match.cjs");
const watchSeed = require("./watch-seed.cjs");
const opportunityScan = require("./opportunity-scan.cjs");
const capitalProvider = require("./capital-provider-projection.cjs");
const balanceAwareFeed = require("./balance-aware-feed.cjs");
const matchStrictness = require("./match-strictness.cjs");
const membership = require("./membership.cjs");
const adapterMatchingKpi = require("./adapter-matching-kpi.cjs");

module.exports = {
  ...money,
  ...markets,
  ...forbidden,
  ...pipeline,
  ...pricing,
  ...fx,
  ...capitalBand,
  ...assetMaster,
  ...assetImage,
  ...adapters,
  ...marketPartners,
  ...cardGrade,
  ...cardMatch,
  ...tradingCardSeed,
  ...bagMatch,
  ...luxuryBagSeed,
  ...watchMatch,
  ...watchSeed,
  ...opportunityScan,
  ...capitalProvider,
  ...balanceAwareFeed,
  ...matchStrictness,
  ...membership,
  ...adapterMatchingKpi,
};
