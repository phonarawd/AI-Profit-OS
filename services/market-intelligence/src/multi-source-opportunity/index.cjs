const contract = require("./contract.cjs");
const { createMultiSourceOpportunity, opportunityIdOf } = require("./create.cjs");

module.exports = {
  ...contract,
  createMultiSourceOpportunity,
  opportunityIdOf,
};
