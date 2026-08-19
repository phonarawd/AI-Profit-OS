/**
 * 공개 접근 차단 시그니처. solver/stealth/우회 없음.
 */

function headerValue(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return String(headers.get(name) || "");
  }
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  const v = key ? headers[key] : "";
  return Array.isArray(v) ? String(v[0] || "") : String(v || "");
}

function detectAccessBlock({ status, headers, body }) {
  const code = Number(status);
  if (code === 401 || code === 403 || code === 429) {
    return { blocked: true, reason: `http_${code}` };
  }
  const mitigated = headerValue(headers, "cf-mitigated");
  if (/challenge/i.test(mitigated)) {
    return { blocked: true, reason: "cf_mitigated_challenge" };
  }
  const text = String(body || "");
  if (
    /cdn-cgi\/challenge-platform/i.test(text) ||
    /challenges\.cloudflare\.com\/turnstile/i.test(text) ||
    /cf-turnstile/i.test(text) ||
    /id=["']challenge-running["']/i.test(text) ||
    /Just a moment/i.test(text) ||
    /잠시만 기다리십시오/i.test(text)
  ) {
    return { blocked: true, reason: "challenge_or_turnstile_html" };
  }
  return { blocked: false };
}

module.exports = { detectAccessBlock, headerValue };
