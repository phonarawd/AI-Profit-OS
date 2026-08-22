/**
 * MATCH 이후에만 CanonicalProduct를 만들거나 기존 상품에 attach.
 * matcher를 호출하지 않는다. PD / source-local을 MATCH evidence로 되먹이지 않는다.
 */

const { CREATE_BLOCKED, PIPELINE_STATUS } = require("./contract.cjs");
const { isGenericProfileFailClosedReason } = require("./generic-profile.cjs");
const {
  buildCanonicalIdentityKey,
  promoteCanonicalAttributes,
} = require("./identity.cjs");

function blocked(reason, extras) {
  return {
    ok: false,
    created: false,
    reason,
    product: null,
    links: [],
    identityKey: null,
    persistence: PIPELINE_STATUS,
    ...(extras || {}),
  };
}

function isConfirmationSuccess(obs) {
  return Boolean(
    obs &&
      obs.observationPurpose === "CONFIRMATION" &&
      obs.sourceStatus === "SUCCESS",
  );
}

function evidenceSummary(matchResult) {
  return {
    matcherVersion: matchResult.matcherVersion,
    decision: matchResult.decision,
    matchPath: matchResult.matchPath,
    evaluatedAt: matchResult.evaluatedAt,
  };
}

function buildSourceLink(obs, matchResult) {
  return {
    source: obs.source,
    sourceItemId: obs.externalItemId,
    sourceUrl: obs.url || null,
    latestObservationRef: obs.id,
    matchingDecision: matchResult.decision,
    matcherVersion: matchResult.matcherVersion,
    evidence: evidenceSummary(matchResult),
  };
}

function evaluateCreatePreconditions(input) {
  const left = input && input.left;
  const right = input && input.right;
  const matchResult = input && input.matchResult;
  const repository = input && input.repository;
  const now = (input && input.now) || new Date().toISOString();

  if (!repository) return { ok: false, blocked: blocked("REPOSITORY_REQUIRED") };
  if (!left || !right || !matchResult) {
    return { ok: false, blocked: blocked("INPUT_REQUIRED") };
  }

  if (matchResult.decision !== "MATCH") {
    return {
      ok: false,
      blocked: blocked(CREATE_BLOCKED.DECISION, { decision: matchResult.decision }),
    };
  }

  if (left.observationPurpose === "DISCOVERY" || right.observationPurpose === "DISCOVERY") {
    return { ok: false, blocked: blocked(CREATE_BLOCKED.DISCOVERY) };
  }
  if (!isConfirmationSuccess(left) || !isConfirmationSuccess(right)) {
    return { ok: false, blocked: blocked(CREATE_BLOCKED.SOURCE_STATUS) };
  }

  if (
    matchResult.leftObservationId !== left.id ||
    matchResult.rightObservationId !== right.id
  ) {
    return { ok: false, blocked: blocked(CREATE_BLOCKED.OBSERVATION_MISMATCH) };
  }

  const promoted = promoteCanonicalAttributes({ left, right, matchResult });
  const categoryProfile = matchResult.categoryProfile || promoted.categoryProfile;
  const keyResult = buildCanonicalIdentityKey(
    categoryProfile,
    promoted.canonicalAttributes,
  );
  if (!keyResult.ok) {
    return {
      ok: false,
      blocked: blocked(
        isGenericProfileFailClosedReason(keyResult.reason)
          ? CREATE_BLOCKED.GENERIC_PROFILE
          : CREATE_BLOCKED.IDENTITY_KEY,
        { missingField: keyResult.missingField || null },
      ),
    };
  }

  return {
    ok: true,
    left,
    right,
    matchResult,
    repository,
    now,
    promoted,
    categoryProfile,
    keyResult,
  };
}

function createCanonicalProductFromMatch(input) {
  const pre = evaluateCreatePreconditions(input);
  if (!pre.ok) return pre.blocked;
  const { left, right, matchResult, repository, now, promoted, categoryProfile, keyResult } = pre;

  for (const obs of [left, right]) {
    const ownerId = repository.getProductIdByObservationRef(obs.id);
    if (!ownerId) continue;
    const existing = repository.getByIdentityKey(keyResult.key);
    if (existing && existing.canonicalProductId === ownerId) continue;
    return blocked(CREATE_BLOCKED.OBSERVATION_CONFLICT, {
      observationId: obs.id,
      existingCanonicalProductId: ownerId,
    });
  }

  let product = repository.getByIdentityKey(keyResult.key);
  let created = false;
  if (!product) {
    product = repository.createProduct({
      categoryProfile,
      canonicalAttributes: promoted.canonicalAttributes,
      identityKey: keyResult.key,
      identityEvidenceSummary: evidenceSummary(matchResult),
      now,
    });
    created = true;
  } else {
    repository.enrichAttributes(
      product.canonicalProductId,
      promoted.canonicalAttributes,
      now,
    );
    product = repository.getProduct(product.canonicalProductId);
  }

  for (const obs of [left, right]) {
    const attached = repository.attachLink(
      product.canonicalProductId,
      buildSourceLink(obs, matchResult),
      obs.id,
    );
    if (!attached.ok) {
      return blocked(attached.reason, {
        observationId: obs.id,
        product,
      });
    }
  }

  return {
    ok: true,
    created,
    reason: created ? "CREATED" : "IDEMPOTENT",
    product: repository.getProduct(product.canonicalProductId),
    links: repository.listLinks(product.canonicalProductId),
    identityKey: keyResult.key,
    persistence: PIPELINE_STATUS,
  };
}

function attachUnlinkedObservationFromMatch(input) {
  const repository = input && input.repository;
  const canonicalProductId = input && input.canonicalProductId;
  const observation = input && input.observation;
  const matchResult = input && input.matchResult;

  if (!repository || !canonicalProductId || !observation || !matchResult) {
    return blocked("INPUT_REQUIRED");
  }
  if (matchResult.decision !== "MATCH") {
    return blocked(CREATE_BLOCKED.DECISION, { decision: matchResult.decision });
  }
  if (!isConfirmationSuccess(observation)) {
    return blocked(
      observation.observationPurpose === "DISCOVERY"
        ? CREATE_BLOCKED.DISCOVERY
        : CREATE_BLOCKED.SOURCE_STATUS,
    );
  }

  const ownerId = repository.getProductIdByObservationRef(observation.id);
  if (ownerId && ownerId !== canonicalProductId) {
    return blocked(CREATE_BLOCKED.OBSERVATION_CONFLICT, {
      observationId: observation.id,
      existingCanonicalProductId: ownerId,
    });
  }

  const product = repository.getProduct(canonicalProductId);
  if (!product) return blocked("PRODUCT_NOT_FOUND");

  const attached = repository.attachLink(
    canonicalProductId,
    buildSourceLink(observation, matchResult),
    observation.id,
  );
  if (!attached.ok) {
    return blocked(attached.reason, { observationId: observation.id, product });
  }

  return {
    ok: true,
    created: false,
    reason: attached.idempotent ? "IDEMPOTENT" : "ATTACHED",
    product: repository.getProduct(canonicalProductId),
    links: repository.listLinks(canonicalProductId),
    identityKey: repository.getIdentityKey(canonicalProductId),
    persistence: PIPELINE_STATUS,
  };
}

async function applyCreateOnRepository(pre) {
  const { left, right, matchResult, repository, now, promoted, categoryProfile, keyResult } = pre;

  for (const obs of [left, right]) {
    const ownerId = await repository.getProductIdByObservationRef(obs.id);
    if (!ownerId) continue;
    const existing = await repository.getByIdentityKey(keyResult.key, categoryProfile);
    if (existing && existing.canonicalProductId === ownerId) continue;
    return blocked(CREATE_BLOCKED.OBSERVATION_CONFLICT, {
      observationId: obs.id,
      existingCanonicalProductId: ownerId,
    });
  }

  let product = await repository.getByIdentityKey(keyResult.key, categoryProfile);
  let created = false;
  if (!product) {
    product = await repository.createProduct({
      categoryProfile,
      canonicalAttributes: promoted.canonicalAttributes,
      identityKey: keyResult.key,
      identityEvidenceSummary: evidenceSummary(matchResult),
      now,
    });
    created = true;
  } else {
    await repository.enrichAttributes(
      product.canonicalProductId,
      promoted.canonicalAttributes,
      now,
    );
    product = await repository.getProduct(product.canonicalProductId);
  }

  for (const obs of [left, right]) {
    const attached = await repository.attachLink(
      product.canonicalProductId,
      buildSourceLink(obs, matchResult),
      obs.id,
    );
    if (!attached.ok) {
      return blocked(attached.reason, {
        observationId: obs.id,
        product,
      });
    }
  }

  const persistence =
    repository.persistence && typeof repository.persistence === "function"
      ? repository.persistence()
      : PIPELINE_STATUS;

  return {
    ok: true,
    created,
    reason: created ? "CREATED" : "IDEMPOTENT",
    product: await repository.getProduct(product.canonicalProductId),
    links: await repository.listLinks(product.canonicalProductId),
    identityKey: keyResult.key,
    persistence,
  };
}

async function createCanonicalProductFromMatchDurable(input) {
  const pre = evaluateCreatePreconditions(input);
  if (!pre.ok) return pre.blocked;
  const repository = pre.repository;
  if (!repository || typeof repository.withTransaction !== "function") {
    return blocked("DURABLE_REPOSITORY_REQUIRES_TRANSACTION");
  }
  return repository.withTransaction(async (txRepo) => {
    return applyCreateOnRepository({ ...pre, repository: txRepo });
  });
}

module.exports = {
  evaluateCreatePreconditions,
  createCanonicalProductFromMatch,
  createCanonicalProductFromMatchDurable,
  attachUnlinkedObservationFromMatch,
};
