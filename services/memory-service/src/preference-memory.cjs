/**
 * Normalized preference promotion — Engine §47.16.2 (reference-resolution)
 * Durable ai_memory append = preferenceKey/value enum ONLY.
 * Raw user utterance is NEVER stored. Content = server template.
 */

"use strict";

const { assertNoMemoryMoneyKeys } = require("./memory.cjs");

/** Whitelist — only these keys may be written to durable memory metadata */
const PREFERENCE_KEY_WHITELIST = Object.freeze({
  explanation_length: Object.freeze(["short", "normal", "detailed"]),
  explanation_style: Object.freeze(["simple", "normal"]),
});

const PREFERENCE_RULES = Object.freeze([
  {
    preferenceKey: "explanation_length",
    value: "short",
    re: /짧게\s*(말해|알려|설명해)|간단히|짧게/,
    content: "설명 길이를 짧게 선호해요.",
  },
  {
    preferenceKey: "explanation_length",
    value: "detailed",
    re: /자세히|상세히|길게\s*(말해|설명해)/,
    content: "설명 길이를 자세히 선호해요.",
  },
  {
    preferenceKey: "explanation_style",
    value: "simple",
    re: /쉽게\s*(말해|알려|설명해)|쉽게|쉽게\s*해/,
    content: "설명을 쉽게 선호해요.",
  },
  {
    preferenceKey: "explanation_style",
    value: "normal",
    re: /다음에도\s*이렇게|그대로\s*기억해|이\s*스타일로/,
    content: "지금과 같은 설명 스타일을 유지해요.",
  },
]);

/**
 * @param {string} preferenceKey
 * @param {string} value
 */
function isAllowedPreference(preferenceKey, value) {
  const allowed = PREFERENCE_KEY_WHITELIST[preferenceKey];
  return Boolean(allowed && allowed.includes(value));
}

/**
 * Narrow allowlist match — at most one promotion per turn.
 * @param {string} userText
 * @returns {{preferenceKey:string, value:string, content:string}|null}
 */
function matchNormalizedPreference(userText) {
  const text = String(userText || "").trim();
  if (!text) return null;
  for (const rule of PREFERENCE_RULES) {
    if (!rule.re.test(text)) continue;
    if (!isAllowedPreference(rule.preferenceKey, rule.value)) continue;
    return Object.freeze({
      preferenceKey: rule.preferenceKey,
      value: rule.value,
      content: rule.content,
    });
  }
  return null;
}

/**
 * Payload for MemoryService.append — never includes raw utterance.
 * @param {{preferenceKey:string, value:string, content:string}} match
 */
function buildPreferenceAppendInput(match) {
  if (!match || !isAllowedPreference(match.preferenceKey, match.value)) {
    throw new Error("PREFERENCE_NOT_ALLOWED");
  }
  const metadata = {
    preferenceKey: match.preferenceKey,
    value: match.value,
    provenance: "normalized_preference",
  };
  assertNoMemoryMoneyKeys(metadata);
  return Object.freeze({
    kind: "preference",
    content: String(match.content),
    metadata: Object.freeze(metadata),
  });
}

/**
 * Guard for any durable preference metadata object.
 * @param {Record<string, unknown>} metadata
 */
function assertPreferenceMetadata(metadata) {
  assertNoMemoryMoneyKeys(metadata);
  const key = metadata?.preferenceKey != null ? String(metadata.preferenceKey) : "";
  const value = metadata?.value != null ? String(metadata.value) : "";
  if (!isAllowedPreference(key, value)) {
    const err = new Error("PREFERENCE_KEY_NOT_WHITELISTED");
    err.code = "PREFERENCE_KEY_NOT_WHITELISTED";
    throw err;
  }
  if (metadata?.provenance !== "normalized_preference") {
    const err = new Error("PREFERENCE_PROVENANCE_REQUIRED");
    err.code = "PREFERENCE_PROVENANCE_REQUIRED";
    throw err;
  }
}

module.exports = {
  PREFERENCE_KEY_WHITELIST,
  PREFERENCE_RULES,
  isAllowedPreference,
  matchNormalizedPreference,
  buildPreferenceAppendInput,
  assertPreferenceMetadata,
};
