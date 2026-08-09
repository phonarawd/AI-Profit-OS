/**
 * LLM adapter shared fetch helpers — Engine §47.13
 * No provider secrets here · callers pass config
 */

"use strict";

/**
 * @param {object} input
 * @param {string} input.url
 * @param {Record<string, string>} [input.headers]
 * @param {unknown} [input.body]
 * @param {number} [input.timeoutMs]
 */
async function postJson(input) {
  const ctrl = new AbortController();
  const timeoutMs = Number(input.timeoutMs) || 30_000;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(input.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.headers || {}),
      },
      body: JSON.stringify(input.body ?? {}),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    return Object.freeze({
      ok: res.ok,
      status: res.status,
      json,
      text,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} content
 */
function extractAssistantText(content) {
  return String(content || "").trim();
}

/**
 * OpenAI-compatible non-stream response
 * @param {object} json
 */
function openAiCompatText(json) {
  const choice = json?.choices?.[0];
  const msg = choice?.message?.content;
  if (typeof msg === "string") return extractAssistantText(msg);
  if (Array.isArray(msg)) {
    return msg
      .map((p) => (typeof p === "string" ? p : p?.text || ""))
      .join("")
      .trim();
  }
  return "";
}

/**
 * @param {number} status
 * @param {object|null} json
 */
function classifyHttpError(status, json) {
  if (status === 429) return "quota";
  if (status >= 500) return "server";
  const msg = String(json?.error?.message || json?.message || "").toLowerCase();
  if (msg.includes("quota") || msg.includes("resource_exhausted")) return "quota";
  return "client";
}

module.exports = {
  postJson,
  extractAssistantText,
  openAiCompatText,
  classifyHttpError,
};
