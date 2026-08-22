/**
 * PUBLIC_JSON 문서 읽기. HTML parser가 아니다.
 */

/**
 * @param {string | object} input
 * @returns {{ ok: true, document: object } | { ok: false, reason: string }}
 */
function parsePublicJson(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return { ok: true, document: input };
  }
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, reason: "empty_document" };
  }
  try {
    const document = JSON.parse(input);
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return { ok: false, reason: "json_not_object" };
    }
    return { ok: true, document };
  } catch {
    return { ok: false, reason: "json_parse" };
  }
}

module.exports = { parsePublicJson };
