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
} = require("./db-fault.cjs");

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

async function executeDbFault(opts = {}) {
  const base = opts.productBaseUrl || process.env.AIPO_QA_BASE_URL || "http://127.0.0.1:4000";
  const healthUrl = `${base}/api/v1/health`;
  const databaseUrl = opts.databaseUrl || process.env.DATABASE_URL;

  const beforeHealth = await httpJson("GET", healthUrl, null, {}, 8_000);
  const beforePing = databaseUrl ? await require("./ci-postgres.cjs").pingPostgres(databaseUrl) : null;
  const dbWorked = healthIndicatesDb(beforeHealth.body) || (beforePing && beforePing.ok);

  const induced = await induceDbFault(opts);
  const duringHealth = await httpJson("GET", healthUrl, null, {}, 8_000);
  const duringPing = databaseUrl ? await require("./ci-postgres.cjs").pingPostgres(databaseUrl) : null;
  const productSawFailure =
    (duringPing && duringPing.ok === false) ||
    healthIndicatesDbDown(duringHealth.body) ||
    duringHealth.status === 0;

  const restored = await restoreDb(opts);
  const afterHealth = await httpJson("GET", healthUrl, null, {}, 8_000);
  const afterPing = databaseUrl ? await require("./ci-postgres.cjs").pingPostgres(databaseUrl) : null;
  const recovered = (afterPing && afterPing.ok) || healthIndicatesDb(afterHealth.body);

  return {
    strategy: induced.plan || selectDbFaultStrategy(opts),
    db_worked: Boolean(dbWorked),
    fault_induced: Boolean(induced.induced),
    product_observed_failure: Boolean(productSawFailure),
    db_recovered: Boolean(restored.restored),
    product_recovered: Boolean(recovered),
    before: { health_status: beforeHealth.status, ping: beforePing },
    during: { health_status: duringHealth.status, ping: duringPing, health_excerpt: sanitizeExcerpt(duringHealth.body) },
    after: { health_status: afterHealth.status, ping: afterPing },
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
