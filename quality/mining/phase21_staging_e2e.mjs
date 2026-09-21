import { createHmac, randomUUID } from "node:crypto";

const PROD_SUPABASE_REF = "gaugwamwceqdnqdqrxqg";
const PROD_API_HOSTS = new Set(["ai-profit-os.onrender.com"]);
const ADMIN_ISSUER = "ai-profit-os-admin";
const ADMIN_AUDIENCE = "aipo-ops";
const USER_ISSUER = "ai-profit-os-nest";
const USER_AUDIENCE = "peotteok-user";
const FUND_AMOUNT = "250";
const ORDINARY_AMOUNT = "20";
const HIGH_VALUE_AMOUNT = "90";
const HIGH_VALUE_REJECT_AMOUNT = "85";
const HIGH_VALUE_THRESHOLD = "80";
const REASON = "PHASE21 격리 staging mutation E2E 검증입니다.";
const mode = String(process.env.PHASE21_E2E_MODE || "preflight").trim().toLowerCase();

function env(name) {
  return String(process.env[name] || "").trim();
}

function envPresent(name) {
  return Boolean(env(name));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function supabaseRefFrom(value) {
  const raw = String(value || "");
  const direct = raw.match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i)?.[1];
  if (direct) return direct;
  return (
    raw.match(/db\.([a-z0-9]{20})\.supabase\.co/i)?.[1] ||
    raw.match(/postgres\.([a-z0-9]{20})/i)?.[1] ||
    null
  );
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt({ secret, subject, issuer, audience, role }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = {
    sub: subject,
    iss: issuer,
    aud: audience,
    iat: now,
    exp: now + 15 * 60,
    jti: randomUUID(),
  };
  if (role) payload.role = role;
  const encoded = base64url(JSON.stringify(payload));
  const data = `${header}.${encoded}`;
  const signature = createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(signature)}`;
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 1000);
  }
}

async function http(baseUrl, method, path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs || 30_000),
  });
  const data = await readResponse(response);
  const expected = options.expected || [200, 201];
  if (!expected.includes(response.status)) {
    throw new Error(
      `${method} ${path} expected ${expected.join("/")} but got ${response.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }
  return { status: response.status, data };
}

function amountNumber(value) {
  const n = Number(value);
  assert(Number.isFinite(n), `invalid amount: ${value}`);
  return n;
}

function amountEq(a, b) {
  return Math.abs(amountNumber(a) - amountNumber(b)) < 1e-9;
}

function amountGte(a, b) {
  return amountNumber(a) + 1e-9 >= amountNumber(b);
}

function idem(prefix) {
  return `phase21-${prefix}-${randomUUID()}`;
}

const fallbackBaseUrl = String(
  process.env.PHASE21_API_BASE_URL ||
    process.env.PHASE06_API_BASE_URL ||
    "https://putduk-mine-api-staging.onrender.com",
).replace(/\/+$/, "");
const target = new URL(fallbackBaseUrl);
assert(target.protocol === "https:", `staging API must use https: ${target.protocol}`);
assert(!PROD_API_HOSTS.has(target.hostname), `refusing Production API host: ${target.hostname}`);

const locallyObservedRefs = [
  process.env.PHASE21_EXPECTED_STAGING_SUPABASE_REF,
  process.env.SUPABASE_PROJECT_REF,
  process.env.SUPABASE_URL,
  process.env.DATABASE_URL,
  process.env.DIRECT_URL,
]
  .map(supabaseRefFrom)
  .filter(Boolean);
for (const ref of locallyObservedRefs) {
  assert(ref !== PROD_SUPABASE_REF, `refusing Production Supabase ref: ${ref}`);
}

const envInventory = {
  PHASE21_E2E_MODE: envPresent("PHASE21_E2E_MODE"),
  PHASE21_API_BASE_URL: envPresent("PHASE21_API_BASE_URL"),
  PHASE21_EXPECTED_API_HOST: envPresent("PHASE21_EXPECTED_API_HOST"),
  PHASE21_EXPECTED_BACKEND_SHA: envPresent("PHASE21_EXPECTED_BACKEND_SHA"),
  PHASE21_EXPECTED_STAGING_SUPABASE_REF: envPresent("PHASE21_EXPECTED_STAGING_SUPABASE_REF"),
  PHASE21_INTERNAL_MINING_TOKEN: envPresent("PHASE21_INTERNAL_MINING_TOKEN"),
  INTERNAL_MINING_TICK_TOKEN: envPresent("INTERNAL_MINING_TICK_TOKEN"),
  JWT_ADMIN_SECRET: envPresent("JWT_ADMIN_SECRET"),
  PHASE06_MAKER_ADMIN_ID: envPresent("PHASE06_MAKER_ADMIN_ID"),
  PHASE06_CHECKER_ADMIN_ID: envPresent("PHASE06_CHECKER_ADMIN_ID"),
  JWT_USER_SECRET: envPresent("JWT_USER_SECRET"),
  PHASE21_USER_ID: envPresent("PHASE21_USER_ID"),
  PHASE21_ALLOW_MUTATION_E2E: envPresent("PHASE21_ALLOW_MUTATION_E2E"),
  PHASE21_ALLOW_TRIAL_RESIDUE: envPresent("PHASE21_ALLOW_TRIAL_RESIDUE"),
};

console.log("PHASE21_STAGING_E2E_PREFLIGHT_START", {
  mode,
  baseUrl: fallbackBaseUrl,
  apiHost: target.hostname,
  locallyObservedSupabaseRefs: locallyObservedRefs,
  envPresent: envInventory,
});

const publicProbe = await http(fallbackBaseUrl, "GET", "/api/v1/mines");
console.log("PHASE21_STAGING_E2E_PUBLIC_PROBE", {
  status: publicProbe.status,
  itemCount: Array.isArray(publicProbe.data?.items) ? publicProbe.data.items.length : null,
});

if (mode !== "mutation") {
  console.log("PHASE21_STAGING_E2E_PREFLIGHT_PASS", {
    apiHost: target.hostname,
    productionApiRejected: true,
    productionSupabaseRejected: true,
    mutationExecuted: false,
  });
  process.exit(0);
}

// Mutation mode is deliberately impossible to enter through defaults.
assert(env("PHASE21_ALLOW_MUTATION_E2E") === "YES", "PHASE21_ALLOW_MUTATION_E2E=YES is required");
assert(env("PHASE21_ALLOW_TRIAL_RESIDUE") === "YES", "PHASE21_ALLOW_TRIAL_RESIDUE=YES is required because trial lasts 24h");
const explicitBaseUrl = env("PHASE21_API_BASE_URL");
assert(explicitBaseUrl, "PHASE21_API_BASE_URL must be explicit in mutation mode");
assert(explicitBaseUrl.replace(/\/+$/, "") === fallbackBaseUrl, "mutation API URL must match preflight URL");
const expectedApiHost = env("PHASE21_EXPECTED_API_HOST");
assert(expectedApiHost && target.hostname === expectedApiHost, `API host mismatch: ${target.hostname}`);
const expectedRef = env("PHASE21_EXPECTED_STAGING_SUPABASE_REF");
assert(/^[a-z0-9]{20}$/.test(expectedRef), "explicit staging Supabase ref is required");
assert(expectedRef !== PROD_SUPABASE_REF, "expected staging ref cannot equal Production ref");
const expectedBackendSha = env("PHASE21_EXPECTED_BACKEND_SHA");
assert(/^[0-9a-f]{40}$/i.test(expectedBackendSha), "exact backend SHA is required");

const internalToken = env("PHASE21_INTERNAL_MINING_TOKEN") || env("INTERNAL_MINING_TICK_TOKEN");
const adminSecret = env("JWT_ADMIN_SECRET");
const userSecret = env("JWT_USER_SECRET");
const makerId = env("PHASE06_MAKER_ADMIN_ID");
const checkerId = env("PHASE06_CHECKER_ADMIN_ID");
const userId = env("PHASE21_USER_ID");
assert(internalToken.length >= 16, "internal mining token is required");
assert(adminSecret.length >= 32, "JWT_ADMIN_SECRET (>=32 chars) is required");
assert(userSecret.length >= 32, "JWT_USER_SECRET (>=32 chars) is required");
assert(isUuid(makerId) && isUuid(checkerId), "maker/checker admin UUIDs are required");
assert(makerId !== checkerId, "maker/checker admin ids must differ");
assert(isUuid(userId), "PHASE21_USER_ID must be a dedicated staging user UUID");

const identity = await http(fallbackBaseUrl, "GET", "/api/v1/internal/mining/staging-identity", {
  headers: { "x-internal-mining-token": internalToken },
});
assert(identity.data?.supabaseProjectRef === expectedRef, `remote DB ref mismatch: ${identity.data?.supabaseProjectRef}`);
assert(identity.data?.supabaseProjectRef !== PROD_SUPABASE_REF, "remote API attested Production Supabase");
assert(identity.data?.gitCommit === expectedBackendSha, `remote backend SHA mismatch: ${identity.data?.gitCommit}`);
console.log("PHASE21_STAGING_IDENTITY_ATTESTED", {
  apiHost: target.hostname,
  supabaseProjectRef: identity.data.supabaseProjectRef,
  gitCommit: identity.data.gitCommit,
});

const makerToken = signJwt({
  secret: adminSecret,
  subject: makerId,
  issuer: ADMIN_ISSUER,
  audience: ADMIN_AUDIENCE,
  role: "super",
});
const checkerToken = signJwt({
  secret: adminSecret,
  subject: checkerId,
  issuer: ADMIN_ISSUER,
  audience: ADMIN_AUDIENCE,
  role: "super",
});
const userToken = signJwt({
  secret: userSecret,
  subject: userId,
  issuer: USER_ISSUER,
  audience: USER_AUDIENCE,
});

const admin = (method, path, token, body, options = {}) =>
  http(fallbackBaseUrl, method, path, {
    token,
    body,
    idempotencyKey: options.idempotencyKey,
    expected: options.expected,
  });
const user = (method, path, body, options = {}) =>
  http(fallbackBaseUrl, method, path, {
    token: userToken,
    body,
    idempotencyKey: options.idempotencyKey,
    expected: options.expected,
  });

const state = {
  mineId: null,
  ordinaryPositionId: null,
  approvedHighPositionId: null,
  rejectedHighPositionId: null,
  pendingReviewIds: new Set(),
  funded: false,
  baselinePrincipal: null,
  trialSessionId: null,
};
const cleanupErrors = [];

async function getBuckets() {
  return (await admin("GET", `/api/v1/admin/users/${encodeURIComponent(userId)}/buckets`, makerToken)).data;
}

async function getUserPosition(positionId) {
  return (await user("GET", `/api/v1/mining/me/positions/${encodeURIComponent(positionId)}`)).data;
}

async function cleanupPosition(positionId, label) {
  if (!positionId) return;
  try {
    const current = await getUserPosition(positionId);
    if (current?.status === "ACTIVE") {
      await user("POST", `/api/v1/mining/positions/${encodeURIComponent(positionId)}/end`, undefined, {
        idempotencyKey: idem(`cleanup-${label}`),
      });
    }
  } catch (error) {
    cleanupErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function cleanupPendingReviews() {
  for (const reviewId of state.pendingReviewIds) {
    try {
      const review = (
        await admin("GET", `/api/v1/admin/mining/high-value-reviews/${encodeURIComponent(reviewId)}`, makerToken)
      ).data;
      if (review?.status === "PENDING") {
        await admin(
          "POST",
          `/api/v1/admin/mining/high-value-reviews/${encodeURIComponent(reviewId)}/reject`,
          checkerToken,
          { reason: `${REASON} cleanup reject` },
          { idempotencyKey: idem("cleanup-review") },
        );
      }
    } catch (error) {
      cleanupErrors.push(`review ${reviewId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function cleanupFunding() {
  if (!state.funded) return;
  try {
    const before = await getBuckets();
    if (!amountGte(before.principalUsdt, FUND_AMOUNT)) {
      throw new Error(`principal ${before.principalUsdt} is below cleanup amount ${FUND_AMOUNT}`);
    }
    await admin(
      "POST",
      `/api/v1/admin/users/${encodeURIComponent(userId)}/balance-adjust`,
      makerToken,
      {
        bucket: "principal",
        kind: "debit",
        amountUsdt: FUND_AMOUNT,
        reason: `${REASON} test funding cleanup`,
        idempotencyKey: idem("funding-debit"),
      },
    );
    state.funded = false;
    const after = await getBuckets();
    if (state.baselinePrincipal != null && !amountEq(after.principalUsdt, state.baselinePrincipal)) {
      throw new Error(`principal did not return to baseline: ${after.principalUsdt} vs ${state.baselinePrincipal}`);
    }
  } catch (error) {
    cleanupErrors.push(`funding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function cleanupMine() {
  if (!state.mineId) return;
  try {
    const current = (await admin("GET", `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}`, makerToken)).data;
    if (current?.status !== "ENDED") {
      await admin(
        "POST",
        `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/end`,
        makerToken,
        { reason: `${REASON} cleanup mine` },
        { idempotencyKey: idem("cleanup-mine") },
      );
    }
  } catch (error) {
    cleanupErrors.push(`mine: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("PHASE21_STAGING_MUTATION_E2E_START", {
  apiHost: target.hostname,
  expectedRef,
  expectedBackendSha,
  userId,
});

let mutationFailure = null;
try {
  const baseline = await getBuckets();
  state.baselinePrincipal = baseline.principalUsdt;
  assert(amountEq(baseline.lockedUsdt, "0"), `fixture user locked bucket must start at zero, got ${baseline.lockedUsdt}`);

  const fundingKey = idem("funding-credit");
  const funding = await admin(
    "POST",
    `/api/v1/admin/users/${encodeURIComponent(userId)}/balance-adjust`,
    makerToken,
    {
      bucket: "principal",
      kind: "credit",
      amountUsdt: FUND_AMOUNT,
      reason: `${REASON} test funding setup`,
      idempotencyKey: fundingKey,
    },
  );
  assert(funding.data?.ok === true, "test principal funding failed");
  state.funded = true;
  const fundedBuckets = await getBuckets();
  assert(
    amountEq(fundedBuckets.principalUsdt, amountNumber(state.baselinePrincipal) + amountNumber(FUND_AMOUNT)),
    `funded principal mismatch: ${fundedBuckets.principalUsdt}`,
  );
  console.log("PASS PHASE21 funding setup");

  const suffix = `${Date.now().toString(36)}${randomUUID().replaceAll("-", "").slice(0, 6)}`.toUpperCase();
  const code = `E2E21_${suffix}`.slice(0, 60);
  const createdMine = await admin(
    "POST",
    "/api/v1/admin/mines",
    makerToken,
    {
      code,
      displayName: `PHASE21 E2E ${suffix.slice(-6)}`,
      description: "PHASE21 isolated staging mutation E2E mine",
      assetCode: "XAU",
      minPrincipalAmount: "10",
      maxPrincipalAmount: "200",
      displayOrder: 999999,
      metadata: { highValueThresholdAmount: HIGH_VALUE_THRESHOLD },
      reason: REASON,
    },
    { idempotencyKey: idem("mine-create") },
  );
  state.mineId = createdMine.data?.mineId;
  assert(isUuid(state.mineId), "mineId missing after create");
  assert(createdMine.data?.status === "READY", `expected READY, got ${createdMine.data?.status}`);

  const createdRate = await admin(
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/rates`,
    makerToken,
    { dailyRate: "0.001", reason: REASON },
    { idempotencyKey: idem("rate-create") },
  );
  const rateVersionId = createdRate.data?.rateVersionId;
  assert(isUuid(rateVersionId), "rateVersionId missing after create");
  assert(createdRate.data?.status === "DRAFT", `expected DRAFT rate, got ${createdRate.data?.status}`);

  const requested = await admin(
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/rates/${encodeURIComponent(rateVersionId)}/request-approval`,
    makerToken,
    { reason: REASON },
    { idempotencyKey: idem("rate-request") },
  );
  assert(requested.data?.status === "APPROVAL_PENDING", `expected APPROVAL_PENDING, got ${requested.data?.status}`);

  await admin(
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/rates/${encodeURIComponent(rateVersionId)}/approve`,
    makerToken,
    { reason: REASON },
    { idempotencyKey: idem("rate-self-approve"), expected: [409] },
  );

  const approved = await admin(
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/rates/${encodeURIComponent(rateVersionId)}/approve`,
    checkerToken,
    { reason: REASON },
    { idempotencyKey: idem("rate-approve") },
  );
  assert(approved.data?.approvedByAdminId === checkerId, "checker identity not persisted on rate approval");

  const activated = await admin(
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/rates/${encodeURIComponent(rateVersionId)}/schedule`,
    makerToken,
    { effectiveAt: new Date(Date.now() - 1000).toISOString(), reason: REASON },
    { idempotencyKey: idem("rate-schedule") },
  );
  assert(activated.data?.status === "ACTIVE", `rate activation failed: ${activated.data?.status}`);

  const published = await admin(
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(state.mineId)}/publish`,
    makerToken,
    { reason: REASON },
    { idempotencyKey: idem("mine-publish") },
  );
  assert(published.data?.status === "ACTIVE", `mine publish failed: ${published.data?.status}`);
  console.log("PASS PHASE21 maker/checker mine + rate lifecycle");

  const ordinaryStartKey = idem("ordinary-start");
  const ordinary = await user(
    "POST",
    "/api/v1/mining/positions/start",
    { mineId: state.mineId, principalAmount: ORDINARY_AMOUNT, assetCode: "XAU" },
    { idempotencyKey: ordinaryStartKey },
  );
  state.ordinaryPositionId = ordinary.data?.positionId;
  assert(isUuid(state.ordinaryPositionId), "ordinary positionId missing");
  assert(ordinary.data?.status === "ACTIVE", `ordinary start must be ACTIVE, got ${ordinary.data?.status}`);
  const ordinaryReplay = await user(
    "POST",
    "/api/v1/mining/positions/start",
    { mineId: state.mineId, principalAmount: ORDINARY_AMOUNT, assetCode: "XAU" },
    { idempotencyKey: ordinaryStartKey },
  );
  assert(ordinaryReplay.data?.positionId === state.ordinaryPositionId, "ordinary start idempotency replay changed position");

  const increaseKey = idem("ordinary-increase");
  const increased = await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.ordinaryPositionId)}/increase`,
    { principalAmount: "5", assetCode: "XAU" },
    { idempotencyKey: increaseKey },
  );
  const increaseReplay = await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.ordinaryPositionId)}/increase`,
    { principalAmount: "5", assetCode: "XAU" },
    { idempotencyKey: increaseKey },
  );
  assert(increaseReplay.data?.positionId === state.ordinaryPositionId, "increase replay changed position");
  assert(amountEq(increased.data?.principalAmount, increaseReplay.data?.principalAmount), "increase replay changed principal");

  const decreaseKey = idem("ordinary-decrease");
  const decreased = await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.ordinaryPositionId)}/decrease`,
    { principalAmount: "5", assetCode: "XAU" },
    { idempotencyKey: decreaseKey },
  );
  const decreaseReplay = await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.ordinaryPositionId)}/decrease`,
    { principalAmount: "5", assetCode: "XAU" },
    { idempotencyKey: decreaseKey },
  );
  assert(amountEq(decreased.data?.principalAmount, decreaseReplay.data?.principalAmount), "decrease replay changed principal");

  const ordinaryEndKey = idem("ordinary-end");
  const ended = await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.ordinaryPositionId)}/end`,
    undefined,
    { idempotencyKey: ordinaryEndKey },
  );
  assert(ended.data?.status === "ENDED", `ordinary end failed: ${ended.data?.status}`);
  const endReplay = await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.ordinaryPositionId)}/end`,
    undefined,
    { idempotencyKey: ordinaryEndKey },
  );
  assert(endReplay.data?.status === "ENDED", "ordinary end replay is not ENDED");
  console.log("PASS PHASE21 ordinary start/increase/decrease/end idempotency");

  const highStartKey = idem("high-start");
  const highPending = await user(
    "POST",
    "/api/v1/mining/positions/start",
    { mineId: state.mineId, principalAmount: HIGH_VALUE_AMOUNT, assetCode: "XAU" },
    { idempotencyKey: highStartKey },
  );
  state.approvedHighPositionId = highPending.data?.positionId;
  assert(highPending.data?.status === "START_PENDING", `high-value start must be START_PENDING, got ${highPending.data?.status}`);
  const highReplay = await user(
    "POST",
    "/api/v1/mining/positions/start",
    { mineId: state.mineId, principalAmount: HIGH_VALUE_AMOUNT, assetCode: "XAU" },
    { idempotencyKey: highStartKey },
  );
  assert(highReplay.data?.positionId === state.approvedHighPositionId, "high-value start replay changed position");

  const pendingReviews = await admin(
    "GET",
    `/api/v1/admin/mining/high-value-reviews?mineId=${encodeURIComponent(state.mineId)}&userId=${encodeURIComponent(userId)}&status=PENDING`,
    makerToken,
  );
  const approvalReview = pendingReviews.data?.items?.find((row) => row.positionId === state.approvedHighPositionId);
  assert(isUuid(approvalReview?.highValueReviewId), "pending high-value review not found");
  state.pendingReviewIds.add(approvalReview.highValueReviewId);
  const approveKey = idem("high-approve");
  const reviewApproved = await admin(
    "POST",
    `/api/v1/admin/mining/high-value-reviews/${encodeURIComponent(approvalReview.highValueReviewId)}/approve`,
    checkerToken,
    { reason: REASON },
    { idempotencyKey: approveKey },
  );
  assert(reviewApproved.data?.status === "APPROVED", `high-value approval failed: ${reviewApproved.data?.status}`);
  state.pendingReviewIds.delete(approvalReview.highValueReviewId);
  const approveReplay = await admin(
    "POST",
    `/api/v1/admin/mining/high-value-reviews/${encodeURIComponent(approvalReview.highValueReviewId)}/approve`,
    checkerToken,
    { reason: REASON },
    { idempotencyKey: approveKey },
  );
  assert(approveReplay.data?.status === "APPROVED", "high-value approval replay failed");
  const highActive = await getUserPosition(state.approvedHighPositionId);
  assert(highActive?.status === "ACTIVE", `approved high-value position is not ACTIVE: ${highActive?.status}`);
  await user(
    "POST",
    `/api/v1/mining/positions/${encodeURIComponent(state.approvedHighPositionId)}/end`,
    undefined,
    { idempotencyKey: idem("high-end") },
  );

  const beforeRejectBuckets = await getBuckets();
  const rejectPending = await user(
    "POST",
    "/api/v1/mining/positions/start",
    { mineId: state.mineId, principalAmount: HIGH_VALUE_REJECT_AMOUNT, assetCode: "XAU" },
    { idempotencyKey: idem("high-reject-start") },
  );
  state.rejectedHighPositionId = rejectPending.data?.positionId;
  assert(rejectPending.data?.status === "START_PENDING", "reject-path high-value start must be pending");
  const rejectList = await admin(
    "GET",
    `/api/v1/admin/mining/high-value-reviews?mineId=${encodeURIComponent(state.mineId)}&userId=${encodeURIComponent(userId)}&status=PENDING`,
    makerToken,
  );
  const rejectReview = rejectList.data?.items?.find((row) => row.positionId === state.rejectedHighPositionId);
  assert(isUuid(rejectReview?.highValueReviewId), "reject-path review not found");
  state.pendingReviewIds.add(rejectReview.highValueReviewId);
  const rejectKey = idem("high-reject");
  const rejected = await admin(
    "POST",
    `/api/v1/admin/mining/high-value-reviews/${encodeURIComponent(rejectReview.highValueReviewId)}/reject`,
    checkerToken,
    { reason: REASON },
    { idempotencyKey: rejectKey },
  );
  assert(rejected.data?.status === "REJECTED", `high-value rejection failed: ${rejected.data?.status}`);
  state.pendingReviewIds.delete(rejectReview.highValueReviewId);
  const rejectReplay = await admin(
    "POST",
    `/api/v1/admin/mining/high-value-reviews/${encodeURIComponent(rejectReview.highValueReviewId)}/reject`,
    checkerToken,
    { reason: REASON },
    { idempotencyKey: rejectKey },
  );
  assert(rejectReplay.data?.status === "REJECTED", "high-value rejection replay failed");
  const rejectedPosition = await getUserPosition(state.rejectedHighPositionId);
  assert(rejectedPosition?.status === "ENDED", `rejected position must be ENDED, got ${rejectedPosition?.status}`);
  const afterRejectBuckets = await getBuckets();
  assert(amountEq(beforeRejectBuckets.principalUsdt, afterRejectBuckets.principalUsdt), "high-value reject moved principal");
  assert(amountEq(beforeRejectBuckets.lockedUsdt, afterRejectBuckets.lockedUsdt), "high-value reject moved locked balance");
  console.log("PASS PHASE21 high-value approve/reject + idempotency + no-lock rejection");

  const currentTrialConfig = (await admin("GET", "/api/v1/admin/mining/trial-config", makerToken)).data;
  const configKey = idem("trial-config");
  const configBody = {
    welcomeKrw: currentTrialConfig.welcomeKrw,
    profitCapKrw: currentTrialConfig.profitCapKrw,
    defaultMaxParticipations: currentTrialConfig.defaultMaxParticipations,
    requiredCapitalKrwMin: currentTrialConfig.requiredCapitalKrwMin,
    requiredCapitalKrwMax: currentTrialConfig.requiredCapitalKrwMax,
    reason: REASON,
  };
  const configUpdated = await admin("PATCH", "/api/v1/admin/mining/trial-config", makerToken, configBody, {
    idempotencyKey: configKey,
  });
  const configReplay = await admin("PATCH", "/api/v1/admin/mining/trial-config", makerToken, configBody, {
    idempotencyKey: configKey,
  });
  assert(configUpdated.data?.welcomeKrw === configReplay.data?.welcomeKrw, "trial config replay drift");

  const trialBefore = (await user("GET", "/api/v1/mining/trial")).data;
  assert(trialBefore?.status === "NOT_STARTED", `fixture user must have fresh trial state, got ${trialBefore?.status}`);
  const trialKey = idem("trial-start");
  const trialStarted = await user(
    "POST",
    "/api/v1/mining/trial/start",
    { mineId: state.mineId },
    { idempotencyKey: trialKey },
  );
  state.trialSessionId = trialStarted.data?.trialSessionId;
  assert(trialStarted.data?.status === "ACTIVE", `trial must be ACTIVE, got ${trialStarted.data?.status}`);
  assert(isUuid(state.trialSessionId), "trialSessionId missing");
  const trialReplay = await user(
    "POST",
    "/api/v1/mining/trial/start",
    { mineId: state.mineId },
    { idempotencyKey: trialKey },
  );
  assert(trialReplay.data?.trialSessionId === state.trialSessionId, "trial replay changed session");
  assert(trialReplay.data?.status === "ACTIVE", "trial replay is not ACTIVE");
  const startedAt = new Date(trialStarted.data?.startedAt).getTime();
  const completesAt = new Date(trialStarted.data?.completesAt).getTime();
  assert(Number.isFinite(startedAt) && Number.isFinite(completesAt), "trial timestamps missing");
  assert(Math.abs(completesAt - startedAt - 24 * 60 * 60 * 1000) < 2000, "trial window is not 24 hours");
  console.log("PASS PHASE21 trial config/start/idempotency/24h window", {
    trialSessionId: state.trialSessionId,
    residueAccepted: true,
  });

  await cleanupMine();
  await cleanupFunding();

  console.log("PHASE21_STAGING_MUTATION_E2E_PASS", {
    mineId: state.mineId,
    ordinaryPositionId: state.ordinaryPositionId,
    approvedHighPositionId: state.approvedHighPositionId,
    rejectedHighPositionId: state.rejectedHighPositionId,
    trialSessionId: state.trialSessionId,
    makerCheckerSeparated: true,
    remoteIdentityAttested: true,
    principalFundingRestored: !state.funded,
    trialResidueExpiresNaturally: true,
  });
} catch (error) {
  mutationFailure = error;
  console.error("PHASE21_STAGING_MUTATION_E2E_FAILED", error);
} finally {
  await cleanupPosition(state.ordinaryPositionId, "ordinary");
  await cleanupPosition(state.approvedHighPositionId, "high-approved");
  await cleanupPendingReviews();
  await cleanupMine();
  await cleanupFunding();
}

if (cleanupErrors.length) {
  console.error("PHASE21_STAGING_E2E_CLEANUP_ERRORS", cleanupErrors);
  throw new Error(`PHASE21 cleanup failed: ${cleanupErrors.join(" | ")}`);
}
if (mutationFailure) throw mutationFailure;
