const contract = require("./contract.cjs");
const genericProfile = require("./generic-profile.cjs");
const identity = require("./identity.cjs");
const productCode = require("./product-code.cjs");
const { createMemoryCanonicalProductRepository } = require("./repository.cjs");
const { createDurableCanonicalProductRepository } = require("./repository.postgres.cjs");
const {
  toPersistenceRecord,
  fromPersistenceRecord,
} = require("./persistence-mapper.cjs");
const {
  createCanonicalProductFromMatch,
  createCanonicalProductFromMatchDurable,
  attachUnlinkedObservationFromMatch,
} = require("./create-from-match.cjs");

module.exports = {
  ...contract,
  ...genericProfile,
  ...identity,
  ...productCode,
  createMemoryCanonicalProductRepository,
  createDurableCanonicalProductRepository,
  toPersistenceRecord,
  fromPersistenceRecord,
  createCanonicalProductFromMatch,
  createCanonicalProductFromMatchDurable,
  attachUnlinkedObservationFromMatch,
};
