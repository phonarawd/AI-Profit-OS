/**
 * REL-224 Source/Parser health + Founder override + V1/V2/V3 versioning.
 * 버전 본문 in-place overwrite 0. 없는 건강 상태를 HEALTHY 로 채우지 않는다.
 * Founder override = super + HIGH + audit.
 */
"use strict";

const POLICY_KEYS = Object.freeze(["source_parser", "founder_override"]);
const POLICY_KEY_SET = new Set(POLICY_KEYS);
const VERSION_LABELS = Object.freeze(["V1", "V2", "V3"]);
const VERSION_LABEL_SET = new Set(VERSION_LABELS);
const HEALTH_STATUSES = Object.freeze([
  "HEALTHY",
  "DEGRADED",
  "STALE",
  "BLOCKED",
]);
const HEALTH_STATUS_SET = new Set(HEALTH_STATUSES);
const FOUNDER_ROLE = "super";
const FOUNDER_SEVERITY = "HIGH";
const REASON_MIN = 10;
const MONEY_KEYS = Object.freeze(["usdt", "amount", "krw", "balance"]);

function normalizePolicyKey(raw) {
  const key = String(raw || "").trim();
  if (!POLICY_KEY_SET.has(key)) {
    return { ok: false, error: "POLICY_KEY_UNKNOWN" };
  }
  return { ok: true, key };
}

function normalizeLabel(raw) {
  const label = String(raw || "").trim();
  if (!VERSION_LABEL_SET.has(label)) {
    return { ok: false, error: "POLICY_LABEL_UNKNOWN" };
  }
  return { ok: true, label };
}

function requireReason(reason) {
  const text = String(reason || "").trim();
  if (text.length < REASON_MIN) {
    return { ok: false, error: "POLICY_REASON_MIN" };
  }
  return { ok: true, reason: text };
}

function assertNoMoney(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: true, payload: {} };
  }
  for (const key of Object.keys(payload)) {
    if (MONEY_KEYS.includes(String(key).toLowerCase())) {
      return { ok: false, error: "POLICY_MONEY_KEY_FORBIDDEN" };
    }
  }
  return { ok: true, payload };
}

function nextLabel(existingRaw) {
  const existing = Array.isArray(existingRaw) ? existingRaw : [];
  return VERSION_LABELS[existing.length] || null;
}

function publishVersion(existingRaw, labelRaw) {
  const existing = Array.isArray(existingRaw) ? existingRaw.map(String) : [];
  const label = normalizeLabel(labelRaw);
  if (!label.ok) return label;
  if (existing.includes(label.label)) {
    return { ok: false, error: "OVERWRITE_FORBIDDEN" };
  }
  const expected = nextLabel(existing);
  if (!expected) {
    return { ok: false, error: "VERSION_CAP" };
  }
  if (label.label !== expected) {
    return { ok: false, error: "VERSION_ORDER" };
  }
  return { ok: true, label: label.label, overwrite: false };
}

function rollbackHead(existingRaw, toLabelRaw) {
  const existing = Array.isArray(existingRaw) ? existingRaw.map(String) : [];
  const label = normalizeLabel(toLabelRaw);
  if (!label.ok) return label;
  if (!existing.includes(label.label)) {
    return { ok: false, error: "VERSION_MISSING" };
  }
  return {
    ok: true,
    currentLabel: label.label,
    versionsUntouched: true,
  };
}

function requireFounder(roleRaw, severityRaw) {
  const role = String(roleRaw || "").trim();
  const severity = String(severityRaw || "").trim();
  if (role !== FOUNDER_ROLE) {
    return { ok: false, error: "FOUNDER_ROLE_REQUIRED" };
  }
  if (severity !== FOUNDER_SEVERITY) {
    return { ok: false, error: "FOUNDER_SEVERITY_HIGH" };
  }
  return { ok: true, role, severity };
}

function projectHealth(statusRaw) {
  if (statusRaw == null || String(statusRaw).trim() === "") {
    return { ok: true, status: null, filledHealthy: false };
  }
  const status = String(statusRaw).trim();
  if (!HEALTH_STATUS_SET.has(status)) {
    return { ok: false, error: "HEALTH_STATUS_UNKNOWN" };
  }
  return { ok: true, status, filledHealthy: false };
}

module.exports = {
  POLICY_KEYS,
  VERSION_LABELS,
  HEALTH_STATUSES,
  FOUNDER_ROLE,
  FOUNDER_SEVERITY,
  normalizePolicyKey,
  normalizeLabel,
  requireReason,
  assertNoMoney,
  nextLabel,
  publishVersion,
  rollbackHead,
  requireFounder,
  projectHealth,
};
