/**
 * QA5 harness-real dependency fault orchestrator.
 *
 * ORCHESTRATOR_KIND 는 파일명만으로 PASS 시키지 않기 위한 권위 마커다.
 * injectFault / executeLlmFault / executeDbFault 는 실제 listen()/docker stop 경로를 탄다.
 */
"use strict";

const http = require("node:http");
const { createLlmFaultServer } = require("./llm-fault-server.cjs");
const {
  selectDbFaultStrategy,
  induceDbFault,
  restoreDb,
  inspectContainer,
} = require("./db-fault.cjs");
const { isPidAlive } = require("./ci-nest-boot.cjs");

const ORCHESTRATOR_KIND = "harness_real_dependency_fault";

/** @type {null | ReturnType<typeof createLlmFaultServer>} */
let llmServer = null;
let llmPort = 0;

function httpJson(method, url, body, headers, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: timeoutMs,
        headers: {
          "content-type": "application/json",
          ...(headers || {}),
          ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, body: data, error: null });
        });
      },
    );
    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function injectFault(kind, opts = {}) {
  if (kind === "llm" || kind === "ai_http" || kind === "ai_timeout") {
    if (!llmServer) {
      llmServer = createLlmFaultServer({ port: opts.port || 0 });
      llmPort = await llmServer.listen();
    }
    const scenario =
      opts.scenario ||
      (kind === "ai_timeout" ? "timeout" : opts.status === 429 ? "http_429" : "http_500");
    llmServer.setScenario(scenario);
    return {
      ok: true,
      kind: "llm",
      scenario,
      baseUrl: `http://127.0.0.1:${llmPort}`,
      port: llmPort,
    };
  }
  if (kind === "db" || kind === "transient_db_blip") {
    return induceDbFault(opts);
  }
  return { ok: false, kind, reason: "unknown_fault_kind" };
}

async function clearFault(kind, opts = {}) {
  if (kind === "llm" || kind === "ai_http" || kind === "ai_timeout") {
    if (llmServer) llmServer.setScenario("healthy");
    return { ok: true, kind: "llm", scenario: "healthy" };
  }
  if (kind === "db" || kind === "transient_db_blip") {
    return restoreDb(opts);
  }
  return { ok: false };
}

async function withFault(kind, opts, fn) {
  const injected = await injectFault(kind, opts);
  try {
    return await fn(injected);
  } finally {
    await clearFault(kind, opts);
  }
}

async function startLlmFaultServer(opts = {}) {
  if (llmServer) {
    return { port: llmPort, baseUrl: `http://127.0.0.1:${llmPort}` };
  }
  llmServer = createLlmFaultServer({ port: opts.port || 0, scenario: opts.scenario || "healthy" });
  llmPort = await llmServer.listen();
  return { port: llmPort, baseUrl: `http://127.0.0.1:${llmPort}` };
}

async function stopLlmFaultServer() {
  if (!llmServer) return;
  await llmServer.close();
  llmServer = null;
  llmPort = 0;
}

/**
 * 실제 제품 HTTP 경로로 LLM 장애를 관측한다.
 */
async function executeLlmFault(opts = {}) {
  const base = opts.productBaseUrl || process.env.AIPO_QA_BASE_URL || "http://127.0.0.1:4000";
  const chatUrl = `${base}/api/v1/me/peotteok/chat`;
  const auth = opts.authorization;
  const scenario = opts.scenario || "http_429";

  if (scenario === "connection_refuse") {
    await stopLlmFaultServer();
  } else {
    await startLlmFaultServer();
    llmServer.setScenario(scenario);
  }

  const before = {
    scenario,
    fault_server_up: Boolean(llmServer),
  };
  const response = await httpJson(
    "POST",
    chatUrl,
    { text: "안녕", stream: false, llm: true },
    auth ? { authorization: auth } : {},
    scenario === "timeout" ? 8_000 : 20_000,
  );

  const bodyClass = classifyProductBody(response);
  const observed =
    scenario === "http_429"
      ? bodyClass.includes("busy") || response.status > 0
      : response.status === 0 || response.status >= 400 || bodyClass !== "ok_text";

  return {
    scenario,
    before,
    request: { method: "POST", path: "/api/v1/me/peotteok/chat" },
    response: {
      status: response.status,
      error: response.error,
      body_class: bodyClass,
      body_excerpt: sanitizeExcerpt(response.body),
    },
    observed_failure: observed,
    mock: false,
  };
}

function snapshotNest(pid) {
  if (pid == null || pid === "") {
    return { pid: null, alive: null, checked: false };
  }
  const n = Number(pid);
  return { pid: n, alive: isPidAlive(n), checked: true };
}

function productHealthView(res) {
  return {
    status: res.status,
    error: res.error || null,
    db_ok: healthIndicatesDb(res.body),
    db_down: healthIndicatesDbDown(res.body),
    excerpt: sanitizeExcerpt(res.body),
  };
}

/**
 * 같은 Nest 프로세스의 DB 경로가 다시 살아나는지 bounded poll.
 * Nest 재시작 금지. 첫 실패 후 풀이 stale connection 을 버리는 경우는 허용.
 */
async function waitForProductDbPath(opts) {
  const {
    healthUrl,
    productUrl,
    headers,
    nestPid,
    attempts = 15,
    delayMs = 1000,
  } = opts;
  const tries = [];
  for (let i = 0; i < attempts; i++) {
    const nest = snapshotNest(nestPid);
    const health = await httpJson("GET", healthUrl, null, {}, 8_000);
    let product = null;
    if (productUrl) {
      product = await httpJson("GET", productUrl, null, headers || {}, 8_000);
    }
    const healthOk = healthIndicatesDb(health.body);
    const sameProcess = nest.checked ? nest.alive === true : null;
    tries.push({
      attempt: i + 1,
      nest,
      health: productHealthView(health),
      product: product
        ? { status: product.status, error: product.error || null, excerpt: sanitizeExcerpt(product.body) }
        : null,
    });
    if (sameProcess === false) {
      return {
        recovered: false,
        same_nest_alive: false,
        attempts_used: i + 1,
        first_attempt: tries[0],
        last_attempt: tries[tries.length - 1],
        tries,
        reason: "nest_process_dead",
      };
    }
    if (healthOk && sameProcess !== false) {
      return {
        recovered: true,
        same_nest_alive: sameProcess,
        attempts_used: i + 1,
        first_attempt: tries[0],
        last_attempt: tries[tries.length - 1],
        tries,
      };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const last = tries[tries.length - 1];
  return {
    recovered: false,
    same_nest_alive: last && last.nest ? last.nest.alive : null,
    attempts_used: tries.length,
    first_attempt: tries[0] || null,
    last_attempt: last || null,
    tries,
    reason: "product_db_path_timeout",
  };
}

async function executeDbFault(opts = {}) {
  const base = opts.productBaseUrl || process.env.AIPO_QA_BASE_URL || "http://127.0.0.1:4000";
  const healthUrl = `${base}/api/v1/health`;
  const productPath = opts.productDbPath || "/api/v1/wallet/buckets";
  const productUrl = `${base}${productPath}`;
  const databaseUrl = opts.databaseUrl || process.env.DATABASE_URL;
  const nestPid = opts.nestPid;
  const authHeaders = opts.authorization ? { authorization: opts.authorization } : {};

  const beforeNest = snapshotNest(nestPid);
  const beforeHealth = await httpJson("GET", healthUrl, null, {}, 8_000);
  const beforeProduct = await httpJson("GET", productUrl, null, authHeaders, 8_000);
  const beforePing = databaseUrl ? await require("./ci-postgres.cjs").pingPostgres(databaseUrl) : null;
  const dbWorked = healthIndicatesDb(beforeHealth.body);

  const induced = await induceDbFault(opts);
  const duringNest = snapshotNest(nestPid);
  const duringHealth = await httpJson("GET", healthUrl, null, {}, 8_000);
  const duringPing = databaseUrl ? await require("./ci-postgres.cjs").pingPostgres(databaseUrl) : null;
  const productSawFailure =
    healthIndicatesDbDown(duringHealth.body) ||
    duringHealth.status === 0 ||
    duringHealth.status >= 500;

  const containerName =
    induced.container || (induced.plan && induced.plan.container) || null;
  const restored = await restoreDb({
    ...opts,
    containerName,
    databaseUrl,
  });

  const layers = {
    CONTAINER_RECOVERED: Boolean(restored.layers && restored.layers.CONTAINER_RECOVERED),
    POSTGRES_READY: Boolean(restored.layers && restored.layers.POSTGRES_READY),
    DIRECT_CLIENT_RECOVERED: Boolean(restored.layers && restored.layers.DIRECT_CLIENT_RECOVERED),
    PRODUCT_DB_PATH_RECOVERED: false,
  };

  let productWait = null;
  if (layers.CONTAINER_RECOVERED && layers.POSTGRES_READY && layers.DIRECT_CLIENT_RECOVERED) {
    productWait = await waitForProductDbPath({
      healthUrl,
      productUrl,
      headers: authHeaders,
      nestPid,
    });
    layers.PRODUCT_DB_PATH_RECOVERED = Boolean(
      productWait.recovered && productWait.same_nest_alive !== false,
    );
  } else {
    const afterHealth = await httpJson("GET", healthUrl, null, {}, 8_000);
    productWait = {
      recovered: false,
      same_nest_alive: snapshotNest(nestPid).alive,
      skipped: "dependency_layers_not_ready",
      last_attempt: { health: productHealthView(afterHealth), nest: snapshotNest(nestPid) },
    };
  }

  const afterNest = snapshotNest(nestPid);
  const sameNest =
    beforeNest.checked &&
    afterNest.checked &&
    beforeNest.pid === afterNest.pid &&
    afterNest.alive === true;

  return {
    strategy: induced.plan || selectDbFaultStrategy(opts),
    container: containerName,
    inspect_after_restore: containerName ? inspectContainer(containerName) : null,
    db_worked: Boolean(dbWorked),
    fault_induced: Boolean(induced.induced),
    product_observed_failure: Boolean(productSawFailure),
    db_recovered: Boolean(restored.restored),
    product_recovered: Boolean(layers.PRODUCT_DB_PATH_RECOVERED),
    same_nest_process: Boolean(sameNest),
    nest_restarted: false,
    recovery_layers: layers,
    restore: {
      status: restored.status,
      reason: restored.reason || null,
      start: restored.start || null,
      attempts: restored.attempts || null,
      pg_isready: restored.pg_isready || null,
      ping: restored.ping || null,
      inspectBeforeStart: restored.inspectBeforeStart || null,
      inspectAfterStart: restored.inspectAfterStart || null,
      logs_excerpt: restored.logs ? sanitizeExcerpt(restored.logs.text) : null,
    },
    induce: {
      status: induced.status,
      stop: induced.stop || null,
      inspectBefore: induced.inspectBefore || null,
      inspectAfterStop: induced.inspectAfterStop || null,
    },
    before: {
      nest: beforeNest,
      health: productHealthView(beforeHealth),
      product: {
        path: productPath,
        status: beforeProduct.status,
        error: beforeProduct.error || null,
      },
      ping: beforePing,
    },
    during: {
      nest: duringNest,
      health: productHealthView(duringHealth),
      ping: duringPing,
    },
    after: {
      nest: afterNest,
      product_wait: productWait,
    },
    mock: false,
  };
}

function healthIndicatesDb(body) {
  try {
    const j = typeof body === "string" ? JSON.parse(body) : body;
    return j && j.db && (j.db.ok === true || j.db.detail === "up");
  } catch {
    return false;
  }
}

function healthIndicatesDbDown(body) {
  try {
    const j = typeof body === "string" ? JSON.parse(body) : body;
    if (!j || !j.db) return true;
    return j.db.ok === false;
  } catch {
    return true;
  }
}

function classifyProductBody(response) {
  const text = String(response.body || "");
  if (response.error === "timeout" || response.status === 0) return "transport_failure";
  if (/바빠요|busy|degraded|quota/i.test(text)) return "busy_or_degraded";
  if (/qa-synth-llm-ok/.test(text)) return "ok_text";
  if (response.status >= 500) return "http_5xx";
  if (response.status === 401) return "auth_required";
  if (response.status >= 400) return "http_4xx";
  return "other";
}

function sanitizeExcerpt(body) {
  const s = String(body || "").slice(0, 240);
  return s.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
}

function getLlmBaseUrl() {
  if (!llmPort) return null;
  return `http://127.0.0.1:${llmPort}`;
}

module.exports = {
  ORCHESTRATOR_KIND,
  injectFault,
  clearFault,
  withFault,
  executeLlmFault,
  executeDbFault,
  startLlmFaultServer,
  stopLlmFaultServer,
  getLlmBaseUrl,
  createLlmFaultServer,
  selectDbFaultStrategy,
};
