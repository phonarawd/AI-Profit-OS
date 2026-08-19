/**
 * verify:canonical-product
 * MATCH 이후 in-process CanonicalProduct + PD + Generic Product Profile.
 * matcher 수정 0 · durable DB 주장 0.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    if (process.env[key]) continue;
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function ownerSide(value) {
  return {
    value,
    normalizedValue: String(value).toLowerCase(),
    evidenceOwner: "OWNER_BACKED_STRUCTURED",
    derivedFrom: null,
    provenanceFamily: "structured",
  };
}

const files = [
  "services/market-intelligence/src/canonical-product/contract.cjs",
  "services/market-intelligence/src/canonical-product/generic-profile.cjs",
  "services/market-intelligence/src/canonical-product/identity.cjs",
  "services/market-intelligence/src/canonical-product/product-code.cjs",
  "services/market-intelligence/src/canonical-product/repository.cjs",
  "services/market-intelligence/src/canonical-product/create-from-match.cjs",
  "services/market-intelligence/src/canonical-product/index.cjs",
  "tooling/verify/canonical-product.cjs",
  "governance/global-product/canonical-product.v2.json",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/canonical-product/contract.cjs",
  "services/market-intelligence/src/canonical-product/generic-profile.cjs",
  "services/market-intelligence/src/canonical-product/identity.cjs",
  "services/market-intelligence/src/canonical-product/product-code.cjs",
  "services/market-intelligence/src/canonical-product/repository.cjs",
  "services/market-intelligence/src/canonical-product/create-from-match.cjs",
  "services/market-intelligence/src/canonical-product/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

const createSrc = read("services/market-intelligence/src/canonical-product/create-from-match.cjs");
const identitySrc = read("services/market-intelligence/src/canonical-product/identity.cjs");
const matcherSrc = read("services/market-intelligence/src/identity-matching/v2/matcher.cjs");

if (createSrc.includes("matchSourceObservationsV2")) {
  fail("create path must not call matchSourceObservationsV2");
}
if (createSrc.includes("identity-matching/v2/matcher")) {
  fail("create path must not require matcher");
}
if (identitySrc.includes("nativeAmount") || createSrc.includes("nativeAmount")) {
  fail("PRICE_IDENTITY_BLOCK — canonical create/identity must not read nativeAmount");
}
if (/samePhysicalItem\s*[:=]\s*true/i.test(runtimeSrc)) {
  fail("SAME_PHYSICAL_ITEM must never be inferred as true");
}
if (!runtimeSrc.includes('SAME_CANONICAL_PRODUCT_EQUALS_SAME_PHYSICAL_ITEM = "NO"')) {
  fail("SAME_CANONICAL_PRODUCT_EQUALS_SAME_PHYSICAL_ITEM = NO missing");
}
if (runtimeSrc.includes("Math.random") || /openai|llm/i.test(runtimeSrc)) {
  fail("canonical runtime must stay deterministic except UUID allocation");
}
if (matcherSrc.includes("createCanonicalProductFromMatch")) {
  fail("matcher must not create CanonicalProduct");
}

const gov = readJson("governance/global-product/canonical-product.v2.json");
if (!gov) {
  fail("canonical-product.v2.json unreadable");
} else {
  if (gov.runtime !== "DURABLE_DB_RUNTIME_VERIFIED") {
    fail("governance runtime must be DURABLE_DB_RUNTIME_VERIFIED after local durable proof");
  }
  if (gov.authority && gov.authority.CREATE_ONLY_AFTER_MATCH !== true) {
    fail("CREATE_ONLY_AFTER_MATCH must stay true");
  }
  if (gov.authority && gov.authority.PUTDUK_PRODUCT_ID_EQUALS_MATCH_EVIDENCE !== "NO") {
    fail("PUTDUK_PRODUCT_ID_EQUALS_MATCH_EVIDENCE must stay NO");
  }
  if (gov.persistence.CANONICAL_PRODUCT_MEMORY_RUNTIME !== "IN_PROCESS_MEMORY") {
    fail("memory runtime must remain IN_PROCESS_MEMORY");
  }
  if (gov.persistence.CANONICAL_PRODUCT_DB_RUNTIME !== "PASS") {
    fail("CANONICAL_PRODUCT_DB_RUNTIME must be PASS after local durable proof");
  }
  if (gov.persistence.CANONICAL_PRODUCT_SOURCE_LINK_DB_RUNTIME !== "PASS") {
    fail("CANONICAL_PRODUCT_SOURCE_LINK_DB_RUNTIME must be PASS after local durable proof");
  }
  if (gov.persistence.PUTDUK_PRODUCT_ID_DURABLE_STABILITY !== "PASS") {
    fail("PUTDUK_PRODUCT_ID_DURABLE_STABILITY must be PASS after local durable proof");
  }
  if (gov.persistence.PRODUCTION_CANONICAL_PRODUCT_PERSISTENCE !== "NOT_IMPLEMENTED") {
    fail("PRODUCTION_CANONICAL_PRODUCT_PERSISTENCE must stay NOT_IMPLEMENTED");
  }
  if (gov.persistence.REMOTE_SUPABASE_CANONICAL_PRODUCT_RUNTIME_VERIFICATION !== "NOT_VERIFIED") {
    fail("REMOTE_SUPABASE_CANONICAL_PRODUCT_RUNTIME_VERIFICATION must stay NOT_VERIFIED");
  }
  if (gov.persistence.CANONICAL_PRODUCT_DB_RUNTIME_VERIFIED_ENVIRONMENT !== "CURSOR_CREATED_LOCAL_TEST_POSTGRES") {
    fail("local durable environment must stay CURSOR_CREATED_LOCAL_TEST_POSTGRES");
  }
  if (gov.canonicalProduct && gov.canonicalProduct.canonicalIdentity) {
    fail("do not add canonicalIdentity truth to governance");
  }
  if (gov.identityKeyFields || gov.requiredIdentityAttributes) {
    fail("do not write new identity key truth into governance");
  }
  if (!gov.genericProductProfile || gov.genericProductProfile.status !== "PASS") {
    fail("genericProductProfile.status must be PASS");
  }
  if (gov.genericProductProfile.architecture !== "UNIVERSAL_FIELDS_PLUS_CATEGORY_PLUGINS") {
    fail("genericProductProfile architecture must stay UNIVERSAL_FIELDS_PLUS_CATEGORY_PLUGINS");
  }
}

const v2 = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/index.cjs"));
if (v2.PIPELINE_STATUS.CANONICAL_PRODUCT_CREATION !== "NOT_IMPLEMENTED") {
  fail("matcher PIPELINE_STATUS.CANONICAL_PRODUCT_CREATION must stay NOT_IMPLEMENTED");
}

const {
  cases,
} = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/fixtures.cjs"));
const cp = require(path.join(
  root,
  "services/market-intelligence/src/canonical-product/index.cjs",
));
const { TCGPLAYER_PARSER_VERSION, EBAY_PARSER_VERSION } = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/contract.cjs",
));
const { observeProduct } = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/observe.cjs",
));
const { credentialsFromEnv } = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/acquire/ebay-browse.cjs",
));

const now = "2026-08-19T12:00:00.000Z";
const byId = {};
for (const row of cases) {
  byId[row.id] = row;
}

function matchCase(row) {
  const opts = { now };
  if (row.allowSyntheticImageEvidence) opts.allowSyntheticImageEvidence = true;
  if (row.imageCorroboration) opts.imageCorroboration = true;
  return v2.matchSourceObservationsV2(row.left, row.right, opts);
}

function assertBlocked(label, result, expectedReason) {
  if (result.ok || result.created) {
    fail(`${label} must be blocked`);
    return;
  }
  if (expectedReason && result.reason !== expectedReason) {
    fail(`${label} reason expected ${expectedReason} got ${result.reason}`);
  }
}

const fixtureA = byId["A-composite-owner-vs-derived"];
const matchA = matchCase(fixtureA);
if (matchA.decision !== "MATCH") fail("fixture A must MATCH for create proof");

const repoA = cp.createMemoryCanonicalProductRepository();
const createdA = cp.createCanonicalProductFromMatch({
  left: fixtureA.left,
  right: fixtureA.right,
  matchResult: matchA,
  repository: repoA,
  now,
});
if (!createdA.ok || !createdA.created || !createdA.product) {
  fail(`fixture A create failed: ${createdA.reason} missing=${createdA.missingField || ""}`);
} else {
  if (createdA.product.categoryProfile !== "trading_card") {
    fail("fixture A categoryProfile must be trading_card");
  }
  if (!/^PD-\d{7}$/.test(createdA.product.putdukProductCode)) {
    fail("PD code must be PD- + 7 digits");
  }
  if (!String(createdA.product.canonicalProductId).startsWith("cp_")) {
    fail("canonicalProductId must use cp_ prefix");
  }
  if (createdA.links.length !== 2) fail("fixture A must attach two source links");
  const attrs = createdA.product.canonicalAttributes || {};
  for (const field of ["game", "set", "cardNumber", "characterOrName"]) {
    if (!attrs[field]) fail(`fixture A missing canonicalAttributes.${field}`);
  }
  if (attrs.title) fail("canonicalAttributes must not copy title");
  const key = cp.buildCanonicalIdentityKey("trading_card", attrs);
  if (!key.ok) fail(`fixture A identity key incomplete: ${key.missingField}`);
  const replay = cp.createCanonicalProductFromMatch({
    left: fixtureA.left,
    right: fixtureA.right,
    matchResult: matchA,
    repository: repoA,
    now,
  });
  if (!replay.ok || replay.created) fail("same-repo replay must be idempotent");
  if (replay.product.putdukProductCode !== createdA.product.putdukProductCode) {
    fail("in-process PD must stay stable on replay");
  }
  if (repoA.listProducts().length !== 1) fail("same pair must not create a duplicate product");
  if (replay.links.length !== 2) fail("idempotent replay must keep two links");
}

const noMatch = cp.createCanonicalProductFromMatch({
  left: fixtureA.left,
  right: fixtureA.right,
  matchResult: { ...matchA, decision: "NO_MATCH", matchPath: null },
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("A-synthetic-NO_MATCH", noMatch, cp.CREATE_BLOCKED.DECISION);

const fixtureB = byId["B-title-derived-only"];
const blockedB = cp.createCanonicalProductFromMatch({
  left: fixtureB.left,
  right: fixtureB.right,
  matchResult: matchCase(fixtureB),
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("B-title-derived-only", blockedB, cp.CREATE_BLOCKED.DECISION);

const fixtureD = byId["D-card-number-conflict"];
const blockedD = cp.createCanonicalProductFromMatch({
  left: fixtureD.left,
  right: fixtureD.right,
  matchResult: matchCase(fixtureD),
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("D-card-number-conflict", blockedD, cp.CREATE_BLOCKED.DECISION);

const fixtureC = byId["C-image-only"];
const blockedC = cp.createCanonicalProductFromMatch({
  left: fixtureC.left,
  right: fixtureC.right,
  matchResult: matchCase(fixtureC),
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("C-image-only", blockedC, cp.CREATE_BLOCKED.DECISION);

const fixtureI = byId["I-discovery-plus-confirmation"];
const matchI = matchCase(fixtureI);
const blockedI = cp.createCanonicalProductFromMatch({
  left: fixtureI.left,
  right: fixtureI.right,
  matchResult: matchI,
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("I-discovery-decision", blockedI, cp.CREATE_BLOCKED.DECISION);
const forcedDiscovery = cp.createCanonicalProductFromMatch({
  left: fixtureI.left,
  right: fixtureI.right,
  matchResult: {
    ...matchI,
    decision: "MATCH",
    matchPath: "STRONG",
    categoryProfile: "trading_card",
    leftObservationId: fixtureI.left.id,
    rightObservationId: fixtureI.right.id,
  },
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("I-discovery-forced-MATCH", forcedDiscovery, cp.CREATE_BLOCKED.DISCOVERY);

const titleOnlyKey = cp.buildCanonicalIdentityKey("trading_card", {
  title: "Pokemon Charizard EX Generations 11/83",
});
if (titleOnlyKey.ok) fail("same title only must not produce an identity key");
if (titleOnlyKey.key) fail("title must not become identity key");

const imagePriceKey = cp.buildCanonicalIdentityKey("trading_card", {
  game: "pokemon",
  set: "Generations",
  cardNumber: "11/83",
  characterOrName: "Charizard",
  title: "ignored title",
  imageUrl: "https://example.com/card.jpg",
  nativeAmount: "99.00",
  sourceItemId: "113669",
  putdukProductCode: "PD-0001842",
  language: "English",
  finishOrEdition: "Holofoil",
});
if (!imagePriceKey.ok) fail("identity key must ignore optional/forbidden extras and still build");
if (
  /title|image|99|113669|pd-0001842|english|holofoil/i.test(imagePriceKey.key || "")
) {
  fail("identity key must omit title/image/price/source/PD/optional enrichment");
}

if (cp.PIPELINE_STATUS.GENERIC_PRODUCT_PROFILE !== "PASS") {
  fail("GENERIC_PRODUCT_PROFILE pipeline status must be PASS");
}
if (cp.GENERIC_PRODUCT_PROFILE_STATUS !== "PASS") {
  fail("GENERIC_PRODUCT_PROFILE_STATUS must be PASS");
}
if (
  JSON.stringify(cp.MVP_CATEGORY_PROFILES) !==
  JSON.stringify(["sneakers", "trading_card", "watch", "luxury_bag"])
) {
  fail("mvp profiles must be sneakers/trading_card/watch/luxury_bag");
}
if (
  JSON.stringify(cp.UNIVERSAL_FIELD_CATALOG) !==
  JSON.stringify([
    "brand",
    "manufacturer",
    "model",
    "productName",
    "category",
    "gtin",
    "upc",
    "ean",
    "mpn",
    "variant",
    "color",
    "size",
    "capacity",
    "condition",
    "structuredAttributes",
    "images",
  ])
) {
  fail("UNIVERSAL_FIELD_CATALOG must keep the generic identity field set");
}

const genericKey = cp.buildCanonicalIdentityKey("unknown", {
  game: "pokemon",
  set: "Generations",
  cardNumber: "11/83",
  characterOrName: "Charizard",
});
if (genericKey.ok || genericKey.reason !== cp.GENERIC_PROFILE_REASONS.UNSUPPORTED) {
  fail("unknown category must stay GENERIC_PRODUCT_PROFILE_UNSUPPORTED");
}

for (const deferred of cp.DEFERRED_CATEGORY_PROFILES) {
  const deferredKey = cp.buildCanonicalIdentityKey(deferred, {
    brand: "Sony",
    model: "WH-1000XM5",
    gtin: "4548736132345",
  });
  if (deferredKey.ok || deferredKey.reason !== cp.GENERIC_PROFILE_REASONS.DEFERRED) {
    fail(`${deferred} must stay GENERIC_PRODUCT_PROFILE_DEFERRED`);
  }
}

const sneakerKey = cp.buildCanonicalIdentityKey("sneakers", {
  brand: "Nike",
  manufacturerStyleCode: "DD1391-100",
  model: "Dunk Low",
  colorway: "Panda",
  size: "10",
  title: "Nike Dunk Low Panda",
  imageUrl: "https://example.com/sneaker.jpg",
  gtin: "0196148530123",
});
const sneakerOtherSize = cp.buildCanonicalIdentityKey("sneakers", {
  brand: "Nike",
  manufacturerStyleCode: "DD1391-100",
  size: "12",
});
if (!sneakerKey.ok || !sneakerOtherSize.ok || sneakerKey.key !== sneakerOtherSize.key) {
  fail("sneakers size is VARIANT and must not change identity key");
}
if (/size=|title=|image|0196148530123|dunk low|panda/i.test(sneakerKey.key || "")) {
  fail("sneakers identity key must stay brand + manufacturerStyleCode");
}

const watchKey = cp.buildCanonicalIdentityKey("watch", {
  brand: "Rolex",
  manufacturerReference: "126610LN",
  model: "Submariner",
  condition: "used",
});
const watchNewCondition = cp.buildCanonicalIdentityKey("watch", {
  brand: "Rolex",
  manufacturerReference: "126610LN",
  condition: "new",
});
if (!watchKey.ok || !watchNewCondition.ok || watchKey.key !== watchNewCondition.key) {
  fail("watch condition is listing-not-identity and must not change identity key");
}

const bagKey = cp.buildCanonicalIdentityKey("luxury_bag", {
  brand: "Hermes",
  model: "Mini Kelly",
  size: "20",
  color: "Black",
  material: "Epsom",
  sku: "1956054",
});
const bagOtherSize = cp.buildCanonicalIdentityKey("luxury_bag", {
  brand: "Hermes",
  model: "Mini Kelly",
  size: "25",
  color: "Black",
});
const bagOtherColor = cp.buildCanonicalIdentityKey("luxury_bag", {
  brand: "Hermes",
  model: "Mini Kelly",
  size: "20",
  color: "Gold",
});
if (!bagKey.ok) fail(`luxury_bag identity key failed: ${bagKey.reason} ${bagKey.missingField || ""}`);
if (!bagOtherSize.ok || bagKey.key === bagOtherSize.key) {
  fail("luxury_bag size is identity and must change the key");
}
if (!bagOtherColor.ok || bagKey.key === bagOtherColor.key) {
  fail("luxury_bag color is identity and must change the key");
}
if (/1956054|epsom/i.test(bagKey.key || "")) {
  fail("luxury_bag key must omit source-local sku and optional material");
}

const bagIncomplete = cp.buildCanonicalIdentityKey("luxury_bag", {
  brand: "Hermes",
  model: "Mini Kelly",
});
if (bagIncomplete.ok || bagIncomplete.reason !== "IDENTITY_KEY_INCOMPLETE") {
  fail("luxury_bag without size/color must be IDENTITY_KEY_INCOMPLETE");
}

function confirmationObs(overrides) {
  const meta = overrides.meta || {};
  return {
    id: overrides.id,
    source: overrides.source || "ebay",
    externalItemId: overrides.externalItemId || overrides.id,
    url: overrides.url || `https://example.test/${overrides.id}`,
    title: overrides.title || "Generic profile fixture",
    imageUrl: "https://example.test/img.jpg",
    nativeAmount: "10.00",
    nativeCurrency: "USD",
    observedAt: now,
    fetchedAt: now,
    observationPurpose: "CONFIRMATION",
    sourceStatus: "SUCCESS",
    parserVersion: "fixture.generic-profile",
    displayAuthorized: false,
    meta,
  };
}

function syntheticMatch(left, right, profile, fields) {
  return {
    matcherVersion: "identity-matching.v2",
    decision: "MATCH",
    matchPath: "STRONG",
    categoryProfile: profile,
    leftObservationId: left.id,
    rightObservationId: right.id,
    evaluatedAt: now,
    evidence: Object.entries(fields).map(([field, value]) => ({
      field,
      comparison: "exact",
      left: ownerSide(value),
      right: ownerSide(value),
    })),
  };
}

function proveCreateForProfile(label, profile, fields, leftMeta, rightMeta) {
  const left = confirmationObs({
    id: `obs_gpp_${profile}_left`,
    source: "stockx",
    externalItemId: `${profile}-left`,
    meta: leftMeta,
  });
  const right = confirmationObs({
    id: `obs_gpp_${profile}_right`,
    source: "ebay",
    externalItemId: `${profile}-right`,
    meta: rightMeta,
  });
  const created = cp.createCanonicalProductFromMatch({
    left,
    right,
    matchResult: syntheticMatch(left, right, profile, fields),
    repository: cp.createMemoryCanonicalProductRepository(),
    now,
  });
  if (!created.ok || !created.created || !created.product) {
    fail(`${label} create failed: ${created.reason} missing=${created.missingField || ""}`);
    return;
  }
  if (created.product.categoryProfile !== profile) {
    fail(`${label} categoryProfile must be ${profile}`);
  }
  const key = cp.buildCanonicalIdentityKey(profile, created.product.canonicalAttributes);
  if (!key.ok) fail(`${label} created product identity key incomplete: ${key.missingField}`);
  if (created.persistence.GENERIC_PRODUCT_PROFILE !== "PASS") {
    fail(`${label} persistence GENERIC_PRODUCT_PROFILE must be PASS`);
  }
}

proveCreateForProfile(
  "sneakers",
  "sneakers",
  { brand: "Nike", manufacturerStyleCode: "DD1391-100" },
  {
    brand: "Nike",
    categoryHint: "sneakers",
    identityHints: { categoryProfile: "sneakers", manufacturerStyleCode: "DD1391-100" },
  },
  {
    brand: "Nike",
    categoryHint: "sneakers",
    identityHints: { categoryProfile: "sneakers", manufacturerStyleCode: "DD1391-100" },
  },
);
proveCreateForProfile(
  "watch",
  "watch",
  { brand: "Rolex", manufacturerReference: "126610LN" },
  {
    brand: "Rolex",
    categoryHint: "Wristwatches",
    identityHints: { categoryProfile: "watch", manufacturerReference: "126610LN" },
  },
  {
    brand: "Rolex",
    categoryHint: "Wristwatches",
    identityHints: { categoryProfile: "watch", manufacturerReference: "126610LN" },
  },
);
proveCreateForProfile(
  "luxury_bag",
  "luxury_bag",
  { brand: "Hermes", model: "Mini Kelly", size: "20", color: "Black" },
  {
    brand: "Hermes",
    categoryHint: "luxury bag",
    identityHints: {
      categoryProfile: "luxury_bag",
      model: "Mini Kelly",
      size: "20",
      color: "Black",
    },
  },
  {
    brand: "Hermes",
    categoryHint: "luxury bag",
    identityHints: {
      categoryProfile: "luxury_bag",
      model: "Mini Kelly",
      size: "20",
      color: "Black",
    },
  },
);

const blockedUnknownCreate = cp.createCanonicalProductFromMatch({
  left: fixtureA.left,
  right: fixtureA.right,
  matchResult: {
    ...matchA,
    categoryProfile: "unknown",
  },
  repository: cp.createMemoryCanonicalProductRepository(),
  now,
});
assertBlocked("unknown-profile-create", blockedUnknownCreate, cp.CREATE_BLOCKED.GENERIC_PROFILE);

if (createdA.ok) {
  const attrs = createdA.product.canonicalAttributes;
  const key1 = cp.buildCanonicalIdentityKey("trading_card", attrs);
  const key2 = cp.buildCanonicalIdentityKey("trading_card", {
    ...attrs,
    language: "English",
    finishOrEdition: "Holofoil",
  });
  if (!key1.ok || !key2.ok || key1.key !== key2.key) {
    fail("OPTIONAL_CANONICAL_ATTRIBUTE_ENRICHMENT_CHANGES_IDENTITY_KEY must be NO");
  }
  const enrichedHit = repoA.getByIdentityKey(key2.key);
  if (!enrichedHit || enrichedHit.canonicalProductId !== createdA.product.canonicalProductId) {
    fail("OPTIONAL_ENRICHMENT_CREATES_DUPLICATE_PRODUCT must be NO");
  }
}

if (createdA.ok) {
  const other = repoA.createProduct({
    categoryProfile: "trading_card",
    canonicalAttributes: {
      game: "pokemon",
      set: "Other Set",
      cardNumber: "1/1",
      characterOrName: "Pikachu",
    },
    identityKey: "profile=trading_card|game=pokemon|set=other set|cardNumber=1/1|characterOrName=pikachu",
    identityEvidenceSummary: {
      matcherVersion: "identity-matching.v2",
      decision: "MATCH",
      matchPath: "STRONG",
      evaluatedAt: now,
    },
    now,
  });
  const conflictAttach = cp.attachUnlinkedObservationFromMatch({
    repository: repoA,
    canonicalProductId: other.canonicalProductId,
    observation: fixtureA.left,
    matchResult: matchA,
  });
  assertBlocked(
    "observation-to-other-product",
    conflictAttach,
    cp.CREATE_BLOCKED.OBSERVATION_CONFLICT,
  );

  const conflictCreate = cp.createCanonicalProductFromMatch({
    left: fixtureA.left,
    right: fixtureA.right,
    matchResult: {
      ...matchA,
      evidence: [
        { field: "game", comparison: "exact", left: ownerSide("pokemon"), right: ownerSide("pokemon") },
        { field: "set", comparison: "exact", left: ownerSide("Other Set"), right: ownerSide("Other Set") },
        {
          field: "cardNumber",
          comparison: "exact",
          left: ownerSide("99/99"),
          right: ownerSide("99/99"),
        },
        {
          field: "character",
          comparison: "exact",
          left: ownerSide("Pikachu"),
          right: ownerSide("Pikachu"),
        },
      ],
    },
    repository: repoA,
    now,
  });
  assertBlocked(
    "observation-create-other-identity",
    conflictCreate,
    cp.CREATE_BLOCKED.OBSERVATION_CONFLICT,
  );
}

const pd = cp.formatPutdukProductCode(1);
if (pd !== "PD-0000001") fail("PD-0000001 expected for sequence 1");
if (pd.includes("113669") || pd.includes("377416817781")) {
  fail("PD must not embed pinned source ids");
}

async function proveLivePair() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const creds = credentialsFromEnv();
  const tcg = await observeProduct({
    source: "tcgplayer",
    url: "https://www.tcgplayer.com/product/113669",
    externalItemId: "113669",
    purpose: "CONFIRMATION",
  });
  if (!tcg.ok || !tcg.observation) {
    fail(`live TCG observation failed: ${tcg.reason || tcg.sourceStatus || "unknown"}`);
    return;
  }
  if (!creds.configured) {
    fail("live eBay credentials missing");
    return;
  }
  const ebay = await observeProduct({
    source: "ebay",
    externalItemId: "377416817781",
    purpose: "CONFIRMATION",
    marketplaceId: "EBAY_US",
  });
  if (!ebay.ok || !ebay.observation) {
    fail(`live eBay observation failed: ${ebay.reason || ebay.sourceStatus || "unknown"}`);
    return;
  }

  const tcgObs = tcg.observation;
  const ebayObs = ebay.observation;
  const automatedTcg =
    tcgObs.source === "tcgplayer" &&
    tcgObs.parserVersion === TCGPLAYER_PARSER_VERSION &&
    tcgObs.meta &&
    tcgObs.meta.observationMode === "AUTOMATED_LIVE" &&
    !String(tcgObs.parserVersion).includes("fixture") &&
    !String(tcgObs.parserVersion).includes("live-manual");
  const automatedEbay =
    ebayObs.source === "ebay" &&
    ebayObs.parserVersion === EBAY_PARSER_VERSION &&
    !String(ebayObs.parserVersion).includes("fixture") &&
    !String(ebayObs.parserVersion).includes("live-manual");
  if (!automatedTcg) fail("live TCG input must be automated / non-fixture / non-manual");
  if (!automatedEbay) fail("live eBay input must be automated / non-fixture / non-manual");

  const match = v2.matchSourceObservationsV2(tcgObs, ebayObs, { now });
  if (match.decision !== "MATCH" || match.matchPath !== "COMPOSITE_STRONG") {
    fail(`live pair must MATCH COMPOSITE_STRONG got ${match.decision}/${match.matchPath}`);
    return;
  }

  const repo = cp.createMemoryCanonicalProductRepository();
  const first = cp.createCanonicalProductFromMatch({
    left: tcgObs,
    right: ebayObs,
    matchResult: match,
    repository: repo,
    now,
  });
  if (!first.ok || !first.created) {
    fail(`live create failed: ${first.reason} missing=${first.missingField || ""}`);
    return;
  }
  if (first.product.categoryProfile !== "trading_card") {
    fail("live product categoryProfile must be trading_card");
  }
  if (!/^PD-\d{7}$/.test(first.product.putdukProductCode)) fail("live PD format");
  if (
    first.product.putdukProductCode.includes("113669") ||
    first.product.putdukProductCode.includes("377416817781")
  ) {
    fail("live PD must not embed source-local ids");
  }
  const tcgLink = first.links.find((row) => row.source === "tcgplayer");
  const ebayLink = first.links.find((row) => row.source === "ebay");
  if (!tcgLink || !String(tcgLink.sourceItemId).includes("113669")) {
    fail("live TCG 113669 must be attached as source link only");
  }
  if (!ebayLink || !String(ebayLink.sourceItemId).includes("377416817781")) {
    fail("live eBay 377416817781 must be attached as source link only");
  }
  const attrJson = JSON.stringify(first.product.canonicalAttributes || {});
  if (Object.prototype.hasOwnProperty.call(first.product.canonicalAttributes || {}, "113669")) {
    fail("source-local TCG id must not be a canonicalAttributes key");
  }
  if (attrJson.includes("377416817781")) {
    fail("eBay item id must not live in canonicalAttributes");
  }
  for (const link of first.links) {
    for (const forbidden of ["nativePrice", "priceSemantics", "observedAt", "availability"]) {
      if (Object.prototype.hasOwnProperty.call(link, forbidden)) {
        fail(`link must not carry ${forbidden}`);
      }
    }
    if (!link.evidence || link.evidence.decision !== "MATCH") {
      fail("link evidence must be MATCH provenance summary");
    }
  }

  const second = cp.createCanonicalProductFromMatch({
    left: tcgObs,
    right: ebayObs,
    matchResult: match,
    repository: repo,
    now,
  });
  if (!second.ok || second.created) fail("live same-repo replay must not create a duplicate");
  if (second.product.putdukProductCode !== first.product.putdukProductCode) {
    fail("PUTDUK_PRODUCT_ID_STABLE_WITHIN_REPOSITORY_LIFETIME must PASS");
  }
  if (repo.listProducts().length !== 1) fail("live pair must stay one CanonicalProduct");
  if (first.persistence.PUTDUK_PRODUCT_ID_STABLE !== "PASS_IN_PROCESS_ONLY") {
    fail("PUTDUK_PRODUCT_ID_STABLE must be PASS_IN_PROCESS_ONLY");
  }
  if (first.persistence.PUTDUK_PRODUCT_ID_DURABLE_STABILITY !== "NOT_IMPLEMENTED") {
    fail("PUTDUK_PRODUCT_ID_DURABLE_STABILITY must stay NOT_IMPLEMENTED");
  }
  if (first.persistence.CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE !== "NOT_IMPLEMENTED") {
    fail("CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE must stay NOT_IMPLEMENTED");
  }

  const liveKey = cp.buildCanonicalIdentityKey(
    first.product.categoryProfile,
    first.product.canonicalAttributes,
  );
  const liveEnriched = cp.buildCanonicalIdentityKey(first.product.categoryProfile, {
    ...first.product.canonicalAttributes,
    language: "English",
    finishOrEdition: "Holofoil",
  });
  if (!liveKey.ok || !liveEnriched.ok || liveKey.key !== liveEnriched.key) {
    fail("live optional enrichment must not change identity key");
  }
}

async function main() {
  await proveLivePair();
  if (fails.length) {
    console.error("[verify:canonical-product] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:canonical-product] PASS (in-process CanonicalProduct · Generic Product Profile mvp 4 · PD · MATCH gate · identity key ≠ attributes · observation conflict · live pair)",
  );
}

main().catch((err) => {
  console.error("[verify:canonical-product] FAIL\n- " + String(err && err.message ? err.message : err));
  process.exit(1);
});
