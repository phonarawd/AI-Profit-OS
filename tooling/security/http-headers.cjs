/**
 * REL-401 security header builder. SSOT = governance/security/http-headers.v1.json
 * Document profile = web/admin. API profile = Nest JSON.
 */
const fs = require("fs");
const path = require("path");

const SPEC_REL = "governance/security/http-headers.v1.json";

function loadSpec() {
  const p = path.resolve(__dirname, "../..", SPEC_REL);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function isProduction(opts) {
  if (opts && typeof opts.production === "boolean") return opts.production;
  return process.env.NODE_ENV === "production";
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function documentConnectSrc(spec, production) {
  const h = spec.hosts;
  const src = [
    "'self'",
    h.app,
    h.ops,
    h.api,
    h.root,
    h.go,
    h.webWorkersDev,
    h.opsWorkersDev,
  ];
  if (!production) {
    src.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:4000",
      "http://127.0.0.1:4000",
      "ws://localhost:3000",
      "ws://127.0.0.1:3000",
    );
  }
  return unique(src);
}

function documentCsp(spec, production) {
  const h = spec.hosts;
  const script = ["'self'", "'unsafe-inline'"];
  if (!production) {
    // next dest webpack/turbopack hydrate uses eval(). Production CSP stays fail-closed.
    script.push("'unsafe-eval'");
  }
  const directives = {
    "default-src": ["'self'"],
    "script-src": script,
    "style-src": ["'self'", "'unsafe-inline'", h.pretendard],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      h.ebayImg,
      h.pokemonImg,
      h.ygoImg,
      h.r2Dev,
      spec.allowedHostWildcard[0],
    ],
    "connect-src": documentConnectSrc(spec, production),
    "font-src": ["'self'", "data:", h.pretendard],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
  const parts = Object.entries(directives).map(
    ([name, values]) => name + " " + unique(values).join(" "),
  );
  // Production HTTPS should upgrade any stray HTTP subresource URL.
  // Local QA/dev runs on loopback HTTP and has no loopback TLS endpoint; applying
  // this directive there makes compliant browsers rewrite same-origin HTTP fetches
  // to HTTPS and fail before the QA session stub can resolve.
  if (production) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

function apiCsp() {
  return "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";
}

function headerMap(profile, opts) {
  const spec = loadSpec();
  const production = isProduction(opts);
  const csp = profile === "api" ? apiCsp() : documentCsp(spec, production);
  return {
    "Content-Security-Policy": csp,
    ...spec.staticHeaders,
  };
}

function assertNoWildcardAbuse(csp) {
  const banned = [];
  if (/(?:^|;)\s*\*\s*(?:;|$)/.test(csp)) banned.push("bare *");
  if (/(?:^|;)\s*https:\s*(?:;|$)/.test(csp)) banned.push("scheme https:");
  if (/(?:^|;)\s*http:\s*(?:;|$)/.test(csp)) banned.push("scheme http:");
  if (csp.includes("'unsafe-eval'")) banned.push("unsafe-eval");
  const wildcards = csp.match(/https:\/\/\*\.[^\s;]+/g) || [];
  for (const w of wildcards) {
    if (w !== "https://*.r2.cloudflarestorage.com") {
      banned.push("host wildcard " + w);
    }
  }
  return banned;
}

function applySecurityHeaders(res, profile, opts) {
  const map = headerMap(profile, opts);
  for (const [key, value] of Object.entries(map)) {
    res.setHeader(key, value);
  }
  return map;
}

function nextSecurityHeaderSources(opts) {
  const map = headerMap("document", opts);
  const headers = Object.entries(map).map(([key, value]) => ({ key, value }));
  return [
    { source: "/", headers },
    { source: "/:path*", headers },
  ];
}

module.exports = {
  SPEC_REL,
  loadSpec,
  headerMap,
  applySecurityHeaders,
  nextSecurityHeaderSources,
  assertNoWildcardAbuse,
  documentCsp,
  apiCsp,
};
