"use strict";

const targets = [
  ["staging-web-root", "https://ai-profit-web-preview.ebay-adapter.workers.dev/"],
  ["staging-web-favicon", "https://ai-profit-web-preview.ebay-adapter.workers.dev/favicon.ico"],
  ["staging-web-health-path", "https://ai-profit-web-preview.ebay-adapter.workers.dev/api/v1/health"],
  ["staging-ops-root", "https://ai-profit-ops-preview.ebay-adapter.workers.dev/"],
  ["production-web-root", "https://ai-profit-web.ebay-adapter.workers.dev/"],
];

const allowedHeaders = [
  "content-type",
  "content-length",
  "cache-control",
  "location",
  "server",
  "cf-ray",
  "x-opennext",
];

function sanitize(value) {
  return String(value || "")
    .replace(/[\r\n\u0000\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 800);
}

(async () => {
  const report = [];
  for (const [name, url] of targets) {
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": "ai-profit-os-staging-diagnostic/1" },
      });
      const headers = {};
      for (const key of allowedHeaders) {
        const value = res.headers.get(key);
        if (value != null) headers[key] = value;
      }
      const type = String(res.headers.get("content-type") || "");
      let body = "";
      if (/text|json|html/i.test(type)) {
        body = sanitize(await res.text());
      } else {
        await res.arrayBuffer();
      }
      report.push({ name, url, status: res.status, headers, body });
    } catch (err) {
      report.push({ name, url, error: sanitize(err && err.message ? err.message : err) });
    }
  }
  console.log(JSON.stringify({ schema: "gpt.staging-web-diagnostic.v1", report }, null, 2));
})();
