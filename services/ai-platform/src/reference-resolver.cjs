/**
 * resultRef structural resolver — Engine §47.16.2 (reference-resolution)
 * Hint only · NEVER authorization · NEVER invent ids outside working-state.
 * Final identity is deterministic evidence; LLM is not the authority.
 */

"use strict";

const RESULT_REF_TYPES = Object.freeze([
  "executions",
  "opportunities",
]);

const RESOLUTION_STATUSES = Object.freeze([
  "none",
  "resolved",
  "ambiguous",
  "not_found",
  "unavailable",
]);

/** Max resultRef snapshots retained in working-state */
const MAX_RESULT_REF_SETS = 3;
/** Max ids per snapshot (stable ordinal order) */
const MAX_IDS_PER_REF = 8;

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/** Deictic / ordinal cues that mean the user is referring to a prior result */
const REFERENCE_CUE_RE =
  /그중|위에\s*나온|아까|방금|저번|첫\s*번째|첫번째|두\s*번째|두번째|세\s*번째|세번째|네\s*번째|네번째|다섯\s*번째|다섯번째|\d\s*번째|맨\s*(앞|마지막)|가장\s*(싼|최근|앞)|그\s*(거|것|상품|기회|미션)|결과\s*중/;

const ORDINAL_RULES = Object.freeze([
  {
    index: 0,
    re: /(?:그중|위에(?:\s*나온)?|아까|방금)?\s*(?:첫\s*번째|첫번째|1\s*번째|맨\s*앞|첫\s*거)/,
  },
  {
    index: 1,
    re: /(?:그중|위에(?:\s*나온)?)?\s*(?:두\s*번째|두번째|2\s*번째)/,
  },
  {
    index: 2,
    re: /(?:그중|위에(?:\s*나온)?)?\s*(?:세\s*번째|세번째|3\s*번째)/,
  },
  {
    index: 3,
    re: /(?:그중|위에(?:\s*나온)?)?\s*(?:네\s*번째|네번째|4\s*번째)/,
  },
  {
    index: 4,
    re: /(?:그중|위에(?:\s*나온)?)?\s*(?:다섯\s*번째|다섯번째|5\s*번째)/,
  },
  {
    index: -1,
    re: /(?:맨\s*마지막|가장\s*최근|방금\s*(?:본|나온)|저번(?:에)?|마지막\s*(?:거|것)?)/,
  },
]);

/**
 * @param {unknown} raw
 */
function normalizeResultRef(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "").trim();
  if (!RESULT_REF_TYPES.includes(type)) return null;
  const ids = Array.isArray(raw.ids)
    ? raw.ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .slice(0, MAX_IDS_PER_REF)
    : [];
  if (ids.length === 0) return null;
  const aliases = {};
  if (raw.aliases && typeof raw.aliases === "object") {
    for (const [k, v] of Object.entries(raw.aliases)) {
      const key = String(k || "")
        .trim()
        .toLowerCase();
      const id = String(v || "").trim();
      if (key && id && ids.includes(id)) aliases[key] = id;
    }
  }
  return Object.freeze({
    type,
    ids: Object.freeze(ids),
    aliases: Object.freeze(aliases),
    savedAt: raw.savedAt || raw.saved_at || new Date().toISOString(),
  });
}

/**
 * @param {unknown} list
 */
function normalizeResultRefs(list) {
  const arr = Array.isArray(list) ? list : [];
  const out = [];
  for (const item of arr) {
    const n = normalizeResultRef(item);
    if (n) out.push(n);
  }
  return Object.freeze(out.slice(-MAX_RESULT_REF_SETS));
}

/**
 * Replace/append a resultRef snapshot (newest wins for same type).
 * @param {object[]} existing
 * @param {{type:string, ids:string[], aliases?:Record<string,string>}} next
 */
function upsertResultRef(existing, next) {
  const n = normalizeResultRef(next);
  if (!n) return normalizeResultRefs(existing);
  const prev = normalizeResultRefs(existing).filter((r) => r.type !== n.type);
  return normalizeResultRefs([...prev, n]);
}

/**
 * Pull ordered ids from Fact tool payloads (hint material only).
 * @param {object[]} facts
 * @param {"executions"|"opportunities"} type
 */
function extractResultRefFromFacts(facts, type) {
  const list = Array.isArray(facts) ? facts : [];
  for (const f of list) {
    const p = f?.payload && typeof f.payload === "object" ? f.payload : {};
    if (type === "executions" && Array.isArray(p.executionIds) && p.executionIds.length) {
      return normalizeResultRef({
        type: "executions",
        ids: p.executionIds,
        aliases: p.executionAliases || {},
        savedAt: new Date().toISOString(),
      });
    }
    if (type === "opportunities" && Array.isArray(p.opportunityIds) && p.opportunityIds.length) {
      return normalizeResultRef({
        type: "opportunities",
        ids: p.opportunityIds,
        aliases: p.opportunityAliases || {},
        savedAt: new Date().toISOString(),
      });
    }
  }
  return null;
}

function hasReferenceCue(text) {
  return REFERENCE_CUE_RE.test(String(text || ""));
}

/**
 * 빈 working-state(unavailable) + execution Fact intent → getExecution은 그대로 로드.
 * 서수/별칭 id는 만들지 않는다. ambiguous / not_found 는 추측 금지(숏서킷 유지).
 * Engine §47.16.3 — execution-state intent는 getExecution에 도달해야 한다.
 * @param {{status?: string}|null|undefined} resolution
 * @param {unknown} toolsCalled
 */
function shouldLoadFactsDespiteUnresolvedRef(resolution, toolsCalled) {
  if (!resolution || resolution.status !== "unavailable") return false;
  const tools = Array.isArray(toolsCalled) ? toolsCalled : [];
  return tools.includes("getExecution");
}

/**
 * Flatten candidates from the newest-first resultRefs (stable ordinal = first set that matches type filter, else newest set).
 * @param {object[]} resultRefs
 * @param {string|null} preferType
 */
function candidateSet(resultRefs, preferType) {
  const refs = normalizeResultRefs(resultRefs);
  if (refs.length === 0) return null;
  if (preferType) {
    for (let i = refs.length - 1; i >= 0; i--) {
      if (refs[i].type === preferType) return refs[i];
    }
  }
  return refs[refs.length - 1];
}

/**
 * @param {object} input
 * @param {string} input.text
 * @param {object[]} [input.resultRefs]
 * @returns {{
 *   status: string,
 *   type: string|null,
 *   id: string|null,
 *   ordinal: number|null,
 *   reason: string|null,
 *   candidates: string[],
 *   hintOnly: true
 * }}
 */
function resolveResultReference(input = {}) {
  const text = String(input.text || "").trim();
  const refs = normalizeResultRefs(input.resultRefs);
  const base = () =>
    Object.freeze({
      status: "none",
      type: null,
      id: null,
      ordinal: null,
      reason: null,
      candidates: Object.freeze([]),
      hintOnly: true,
    });

  if (!text) return base();

  // 1) Explicit UUID — must still be inside a bounded resultRef snapshot
  const uuidMatch = text.match(UUID_RE);
  if (uuidMatch) {
    const id = uuidMatch[0].toLowerCase();
    const hits = [];
    for (const ref of refs) {
      for (const candidate of ref.ids) {
        if (String(candidate).toLowerCase() === id) {
          hits.push({ type: ref.type, id: candidate });
        }
      }
    }
    if (hits.length === 1) {
      return Object.freeze({
        status: "resolved",
        type: hits[0].type,
        id: hits[0].id,
        ordinal: null,
        reason: "explicit_id",
        candidates: Object.freeze([hits[0].id]),
        hintOnly: true,
      });
    }
    if (hits.length > 1) {
      return Object.freeze({
        status: "ambiguous",
        type: null,
        id: null,
        ordinal: null,
        reason: "explicit_id_collision",
        candidates: Object.freeze(hits.map((h) => h.id)),
        hintOnly: true,
      });
    }
    // Explicit id mentioned but not in working-state → not_found (do not trust bare id)
    if (hasReferenceCue(text) || UUID_RE.test(text)) {
      return Object.freeze({
        status: "not_found",
        type: null,
        id: null,
        ordinal: null,
        reason: "explicit_id_outside_window",
        candidates: Object.freeze([]),
        hintOnly: true,
      });
    }
  }

  if (!hasReferenceCue(text)) return base();

  if (refs.length === 0) {
    return Object.freeze({
      status: "unavailable",
      type: null,
      id: null,
      ordinal: null,
      reason: "result_refs_empty",
      candidates: Object.freeze([]),
      hintOnly: true,
    });
  }

  const preferType = /기회|미션|상품/.test(text)
    ? "opportunities"
    : /진행|실행|체결|거래|중단|참여한/.test(text)
      ? "executions"
      : null;
  const set = candidateSet(refs, preferType);
  if (!set || set.ids.length === 0) {
    return Object.freeze({
      status: "unavailable",
      type: null,
      id: null,
      ordinal: null,
      reason: "result_refs_empty",
      candidates: Object.freeze([]),
      hintOnly: true,
    });
  }

  // 2) Exact bounded lexical alias (case-insensitive)
  const lower = text.toLowerCase();
  const aliasHits = [];
  for (const [alias, id] of Object.entries(set.aliases || {})) {
    if (alias && lower.includes(alias)) {
      aliasHits.push(id);
    }
  }
  const uniqueAlias = [...new Set(aliasHits)];
  if (uniqueAlias.length === 1) {
    return Object.freeze({
      status: "resolved",
      type: set.type,
      id: uniqueAlias[0],
      ordinal: set.ids.indexOf(uniqueAlias[0]),
      reason: "bounded_alias",
      candidates: Object.freeze([uniqueAlias[0]]),
      hintOnly: true,
    });
  }
  if (uniqueAlias.length > 1) {
    return Object.freeze({
      status: "ambiguous",
      type: set.type,
      id: null,
      ordinal: null,
      reason: "alias_collision",
      candidates: Object.freeze(uniqueAlias),
      hintOnly: true,
    });
  }

  // 3) Ordinal against the stable snapshot order
  for (const rule of ORDINAL_RULES) {
    if (!rule.re.test(text)) continue;
    const idx =
      rule.index === -1 ? set.ids.length - 1 : rule.index;
    if (idx < 0 || idx >= set.ids.length) {
      return Object.freeze({
        status: "not_found",
        type: set.type,
        id: null,
        ordinal: rule.index,
        reason: "ordinal_out_of_range",
        candidates: Object.freeze([...set.ids]),
        hintOnly: true,
      });
    }
    return Object.freeze({
      status: "resolved",
      type: set.type,
      id: set.ids[idx],
      ordinal: idx,
      reason: "ordinal",
      candidates: Object.freeze([set.ids[idx]]),
      hintOnly: true,
    });
  }

  // Cue present but no deterministic match → ambiguous (do not guess)
  return Object.freeze({
    status: "ambiguous",
    type: set.type,
    id: null,
    ordinal: null,
    reason: "reference_cue_unresolved",
    candidates: Object.freeze([...set.ids]),
    hintOnly: true,
  });
}

/**
 * Prompt-safe injection: resolved refs only as REFERENCE_JSON;
 * unresolved states as REFERENCE_STATUS (never as Fact).
 * @param {object} resolution
 */
function referencePromptBlock(resolution) {
  if (!resolution || resolution.status === "none") return null;
  if (resolution.status === "resolved" && resolution.id) {
    return Object.freeze({
      kind: "resolved",
      line: `REFERENCE_JSON=${JSON.stringify({
        type: resolution.type,
        id: resolution.id,
        reason: resolution.reason,
        hintOnly: true,
      })}`,
    });
  }
  return Object.freeze({
    kind: "unresolved",
    line: `REFERENCE_STATUS=${JSON.stringify({
      status: resolution.status,
      reason: resolution.reason,
      candidates: resolution.candidates || [],
      hintOnly: true,
    })}`,
  });
}

module.exports = {
  RESULT_REF_TYPES,
  RESOLUTION_STATUSES,
  MAX_RESULT_REF_SETS,
  MAX_IDS_PER_REF,
  normalizeResultRef,
  normalizeResultRefs,
  upsertResultRef,
  extractResultRefFromFacts,
  hasReferenceCue,
  shouldLoadFactsDespiteUnresolvedRef,
  resolveResultReference,
  referencePromptBlock,
};
