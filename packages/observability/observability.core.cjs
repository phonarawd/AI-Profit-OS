/**
 * REL-016 observability core — 구조화 로그 + 마스킹 + 최소 alert 분류.
 * 프로덕션 토큰 없음.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const MASK = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/observability/mask-keys.v1.json"),
    "utf8",
  ),
);
const RULES = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/observability/alert-rules.v1.json"),
    "utf8",
  ),
);

const AUTH_HITS = [];

function maskValue(key, value) {
  const lower = String(key).toLowerCase();
  if (MASK.keys.some((k) => lower.includes(String(k).toLowerCase()))) {
    return MASK.redacted;
  }
  return value;
}

/** Redact the whole string when a generic message contains money/PII/auth material. */
function redactSensitiveText(input) {
  const text = String(input ?? "");
  const lower = text.toLowerCase();
  if (MASK.keys.some((key) => lower.includes(String(key).toLowerCase()))) {
    return MASK.redacted;
  }
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
    return MASK.redacted;
  }
  if (/\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/i.test(text)) {
    return MASK.redacted;
  }
  if (/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(text)) {
    return MASK.redacted;
  }
  if (/\b(?:\+?82[- .]?)?0?1[016789][- .]?\d{3,4}[- .]?\d{4}\b/.test(text)) {
    return MASK.redacted;
  }
  if (/\b(?:\d+(?:\.\d+)?\s*(?:USDT|KRW)|(?:USDT|KRW)\s*\d+(?:\.\d+)?)\b/i.test(text)) {
    return MASK.redacted;
  }
  return text;
}
function maskDeep(input, depth = 0) {
  if (depth > 6 || input == null) return input;
  if (Array.isArray(input)) return input.map((v) => maskDeep(v, depth + 1));
  if (typeof input === "string") return redactSensitiveText(input);
  if (typeof input !== "object") return input;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] =
      MASK.keys.some((mk) => k.toLowerCase().includes(String(mk).toLowerCase()))
        ? MASK.redacted
        : maskDeep(v, depth + 1);
  }
  return out;
}

function formatObsLog(event) {
  const status = Number(event.status || 0);
  const method = String(event.method || "GET").toUpperCase();
  const pathName = String(event.path || "");
  const payload = maskDeep({
    ts: event.ts || new Date().toISOString(),
    level: event.level || (status >= 500 ? "error" : "info"),
    event: event.event || "http",
    service: event.service || "unknown",
    method,
    path: pathName,
    status,
    requestId: event.requestId || null,
    message: event.message || null,
    fields: event.fields || undefined,
  });
  return {
    json: JSON.stringify(payload),
    payload,
  };
}

function recordAuthFailure(nowMs) {
  const now = Number(nowMs) || Date.now();
  AUTH_HITS.push(now);
  const rule = RULES.rules.find((r) => r.id === "auth_spike");
  const windowMs = rule?.when?.windowMs || 60000;
  const threshold = rule?.when?.threshold || 20;
  while (AUTH_HITS.length && now - AUTH_HITS[0] > windowMs) AUTH_HITS.shift();
  return AUTH_HITS.length >= threshold;
}

function resetAuthSpikeForTest() {
  AUTH_HITS.length = 0;
}

function classifyAlerts(event) {
  const status = Number(event.status || 0);
  const method = String(event.method || "").toUpperCase();
  const pathName = String(event.path || "");
  const alerts = [];
  if (status >= 500) alerts.push("http_5xx");
  if (
    status >= 500 &&
    method === "POST" &&
    /ledger/i.test(pathName)
  ) {
    alerts.push("ledger_write_fail");
  }
  if (status === 401 && recordAuthFailure(event.nowMs)) {
    alerts.push("auth_spike");
  }
  return alerts;
}

function emitObs(event, sink = console) {
  const alerts = classifyAlerts(event);
  const formatted = formatObsLog({
    ...event,
    event: alerts[0] || event.event || "http",
    fields: { ...(event.fields || {}), alerts },
  });
  if (alerts.length || Number(event.status || 0) >= 500) {
    sink.error(formatted.json);
  } else {
    sink.info ? sink.info(formatted.json) : sink.log(formatted.json);
  }
  return { alerts, formatted };
}

module.exports = {
  MASK,
  RULES,
  maskValue,
  maskDeep,
  redactSensitiveText,
  formatObsLog,
  classifyAlerts,
  recordAuthFailure,
  resetAuthSpikeForTest,
  emitObs,
};
