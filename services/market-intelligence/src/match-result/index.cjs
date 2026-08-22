const contract = require("./contract.cjs");
const {
  allocateMatchResultId,
  normalizePair,
  semanticsFingerprint,
  pickDomainMatchResult,
  validatePersistableMatchResult,
  toPersistenceRecord,
  fromPersistenceRecord,
} = require("./persistence-mapper.cjs");
const { createDurableMatchResultRepository } = require("./repository.postgres.cjs");
const { persistMatchResult } = require("./persist.cjs");

module.exports = {
  ...contract,
  allocateMatchResultId,
  normalizePair,
  semanticsFingerprint,
  pickDomainMatchResult,
  validatePersistableMatchResult,
  toPersistenceRecord,
  fromPersistenceRecord,
  createDurableMatchResultRepository,
  persistMatchResult,
};
