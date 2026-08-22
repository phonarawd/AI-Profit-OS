const contract = require("./contract.cjs");
const keys = require("./keys.cjs");
const { generateCandidatePairs } = require("./generate.cjs");

module.exports = {
  ...contract,
  ...keys,
  generateCandidatePairs,
};
