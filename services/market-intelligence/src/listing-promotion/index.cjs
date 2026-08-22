const contract = require("./contract.cjs");
const { evaluateListingPromotion } = require("./promote.cjs");

module.exports = {
  ...contract,
  evaluateListingPromotion,
};
