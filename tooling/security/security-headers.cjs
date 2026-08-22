/**
 * REL-401 — security header SSOT.
 * Nest + Next consume this file. Do not invent a second header table.
 */
"use strict";

const REAL_HOSTS = Object.freeze({
  app: "https://app.hiptk.app",
  ops: "https://ops.hiptk.app",
  api: "https://api.hiptk.app",
  root: "https://hiptk.app",
  go: "https://go.hiptk.app",
  webWorker: "https://ai-profit-web.ebay-adapter.workers.dev",
  opsWorker: "https://ai-profit-ops.ebay-adapter.workers.dev",
});

const LOCAL_API = [
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const IMAGE_HOSTS = [
  "https://i.ebayimg.com",
  "https://images.pokemontcg.io",
  "https://images.ygoprodeck.com",
  "https://asset-images.r2.dev",
  "https://*.r2.cloudflarestorage.com",
];

function cspFor(kind) {
  if (kind === "api") {
    return "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
  }
  const connect = ["'self'", REAL_HOSTS.api, REAL_HOSTS.app, REAL_HOSTS.ops]
    .concat(kind === "admin" ? [REAL_HOSTS.opsWorker] : [REAL_HOSTS.webWorker])
    .concat(LOCAL_API)
    .join(" ");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
    "font-src 'self' data:",
    "worker-src 'self'",
    `connect-src ${connect}`,
  ].join("; ");
}

function headerPairs(kind) {
  return [
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "DENY"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ["Content-Security-Policy", cspFor(kind)],
  ];
}

function nextHeadersFor(kind) {
  return [
    {
      source: "/:path*",
      headers: headerPairs(kind).map(([key, value]) => ({ key, value })),
    },
  ];
}

function applyToExpressResponse(res, kind) {
  for (const [key, value] of headerPairs(kind)) {
    res.setHeader(key, value);
  }
}

function hasWildcardAbuse(csp) {
  const tokens = String(csp)
    .split(/;+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .filter(Boolean);
  return tokens.some((tok) => tok === "*" || tok === "https:" || tok === "http:");
}

module.exports = {
  REAL_HOSTS,
  cspFor,
  headerPairs,
  nextHeadersFor,
  applyToExpressResponse,
  hasWildcardAbuse,
};
