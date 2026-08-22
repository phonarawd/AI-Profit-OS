const contract = require("./contract.cjs");
const { validateObservation, isObviouslyMalformedAmount } = require("./validate.cjs");
const {
  observeProduct,
  parseProductDocument,
  gateObserveSource,
  discoverSourceItems,
} = require("./observe.cjs");
const fashionphile = require("./adapters/fashionphile.cjs");
const chrono24 = require("./adapters/chrono24.cjs");
const ebay = require("./adapters/ebay.cjs");
const tcgplayer = require("./adapters/tcgplayer.cjs");
const { createMemoryRepository, fingerprintObservation } = require("./repository.memory.cjs");
const {
  toPersistenceRecord,
  fromPersistenceRecord,
  fingerprintCanonicalObservation,
  pickCanonicalObservation,
} = require("./persistence-mapper.cjs");
const {
  createDurableSourceObservationRepository,
  classifyDurableDatabaseUrl,
  INSERT_OBSERVATION_SQL,
} = require("./repository.postgres.cjs");

module.exports = {
  ...contract,
  validateObservation,
  isObviouslyMalformedAmount,
  observeProduct,
  parseProductDocument,
  gateObserveSource,
  discoverSourceItems,
  fashionphile,
  chrono24,
  ebay,
  tcgplayer,
  createMemoryRepository,
  fingerprintObservation,
  toPersistenceRecord,
  fromPersistenceRecord,
  fingerprintCanonicalObservation,
  pickCanonicalObservation,
  createDurableSourceObservationRepository,
  classifyDurableDatabaseUrl,
  INSERT_OBSERVATION_SQL,
};
