const contract = require("./contract.cjs");
const normalize = require("./normalize.cjs");
const { matchSourceObservations } = require("./matcher.cjs");

module.exports = {
  ...contract,
  ...normalize,
  matchSourceObservations,
};
