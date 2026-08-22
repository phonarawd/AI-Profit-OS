/**
 * persistMatchResult — V2 평가와 durable 저장을 분리하는 additive API.
 * matcher를 호출하지 않는다. CanonicalProduct를 만들지 않는다.
 */

const { PERSISTENCE_STATUS, PERSIST_BLOCKED } = require("./contract.cjs");
const { validatePersistableMatchResult } = require("./persistence-mapper.cjs");

function blocked(reason, extras) {
  return {
    ok: false,
    persisted: false,
    idempotent: false,
    reason,
    matchResult: null,
    persistence: PERSISTENCE_STATUS,
    ...(extras || {}),
  };
}

async function persistMatchResult(input) {
  const matchResult = input && input.matchResult;
  const repository = input && input.repository;
  if (!repository || typeof repository.save !== "function") {
    return blocked("REPOSITORY_REQUIRED");
  }
  const checked = validatePersistableMatchResult(matchResult);
  if (!checked.ok) {
    return blocked(checked.reason, { failures: checked.failures });
  }
  return repository.save(checked.matchResult);
}

module.exports = {
  persistMatchResult,
  PERSIST_BLOCKED,
};
