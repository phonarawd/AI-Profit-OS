const contract = require("./contract.cjs");
const { evaluateExecutableEconomics } = require("./evaluate.cjs");

module.exports = {
  ...contract,
  evaluateExecutableEconomics,
};
