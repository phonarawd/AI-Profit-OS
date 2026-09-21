const PROD_SUPABASE_REF = "gaugwamwceqdnqdqrxqg";
const PROD_API_HOSTS = new Set([
  "ai-profit-os.onrender.com",
]);

const baseUrl = String(
  process.env.PHASE21_API_BASE_URL ||
    process.env.PHASE06_API_BASE_URL ||
    "https://putduk-mine-api-staging.onrender.com",
).replace(/\/+$/, "");

function envPresent(name) {
  return Boolean(String(process.env[name] || "").trim());
}

function supabaseRefFrom(value) {
  const raw = String(value || "");
  const direct = raw.match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i)?.[1];
  if (direct) return direct;
  return raw.match(/(?:db\.|aws-\d+-[^.]+\.pooler\.supabase\.com[:/]postgres\.[^.]+\.)([a-z0-9]{20})/i)?.[1] ||
    raw.match(/db\.([a-z0-9]{20})\.supabase\.co/i)?.[1] ||
    null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const target = new URL(baseUrl);
assert(target.protocol === "https:", `staging API must use https: ${target.protocol}`);
assert(!PROD_API_HOSTS.has(target.hostname), `refusing Production API host: ${target.hostname}`);

const observedRefs = [
  process.env.PHASE21_EXPECTED_STAGING_SUPABASE_REF,
  process.env.SUPABASE_URL,
  process.env.DATABASE_URL,
  process.env.DIRECT_URL,
]
  .map(supabaseRefFrom)
  .filter(Boolean);

for (const ref of observedRefs) {
  assert(ref !== PROD_SUPABASE_REF, `refusing Production Supabase ref: ${ref}`);
}

const expectedRef = String(process.env.PHASE21_EXPECTED_STAGING_SUPABASE_REF || "").trim();
if (expectedRef) {
  assert(expectedRef !== PROD_SUPABASE_REF, "expected staging ref cannot equal Production ref");
  for (const ref of observedRefs) {
    assert(ref === expectedRef, `staging ref mismatch: expected ${expectedRef}, observed ${ref}`);
  }
}

const envInventory = {
  PHASE06_API_BASE_URL: envPresent("PHASE06_API_BASE_URL"),
  PHASE21_API_BASE_URL: envPresent("PHASE21_API_BASE_URL"),
  JWT_ADMIN_SECRET: envPresent("JWT_ADMIN_SECRET"),
  PHASE06_MAKER_ADMIN_ID: envPresent("PHASE06_MAKER_ADMIN_ID"),
  PHASE06_CHECKER_ADMIN_ID: envPresent("PHASE06_CHECKER_ADMIN_ID"),
  JWT_USER_SECRET: envPresent("JWT_USER_SECRET"),
  PHASE21_USER_ID: envPresent("PHASE21_USER_ID"),
  PHASE21_EXPECTED_STAGING_SUPABASE_REF: envPresent("PHASE21_EXPECTED_STAGING_SUPABASE_REF"),
  SUPABASE_URL: envPresent("SUPABASE_URL"),
  DATABASE_URL: envPresent("DATABASE_URL"),
  DIRECT_URL: envPresent("DIRECT_URL"),
};

console.log("PHASE21_STAGING_E2E_PREFLIGHT_START", {
  baseUrl,
  apiHost: target.hostname,
  observedSupabaseRefs: observedRefs,
  envPresent: envInventory,
});

const response = await fetch(`${baseUrl}/api/v1/mines`, {
  method: "GET",
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(20_000),
});
const text = await response.text();
let body;
try {
  body = text ? JSON.parse(text) : null;
} catch {
  body = text.slice(0, 300);
}

console.log("PHASE21_STAGING_E2E_PUBLIC_PROBE", {
  status: response.status,
  ok: response.ok,
  itemCount: Array.isArray(body?.items) ? body.items.length : null,
  bodyType: Array.isArray(body) ? "array" : typeof body,
});

assert(response.ok, `public mining probe failed with ${response.status}`);

console.log("PHASE21_STAGING_E2E_PREFLIGHT_PASS", {
  apiHost: target.hostname,
  productionApiRejected: true,
  productionSupabaseRejected: true,
  mutationExecuted: false,
});
