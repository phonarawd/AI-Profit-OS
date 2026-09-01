/**
 * verify:rel-401-security-headers
 * Required headers applied. CSP host wildcard abuse 0. SW worker-src self.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function sanitizeLogLine(value) {
  return String(value || "")
    .replace(/[\r\n\u0000\u2028\u2029]/g, " ")
    .slice(0, 300);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const {
  loadSpec,
  headerMap,
  applySecurityHeaders,
  nextSecurityHeaderSources,
  assertNoWildcardAbuse,
} = require("../security/http-headers.cjs");

const spec = loadSpec();
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const webCfg = read("apps/web/next.config.ts");
const adminCfg = read("apps/admin/next.config.ts");
const main = read("services/api-nest/src/main.ts");
const mw = read("services/api-nest/src/common/security-headers.middleware.ts");
const sw = read("apps/web/public/sw.js");
const pwa = read("apps/web/components/pwa/PwaRuntime.tsx");
const theme = read("packages/ui/tokens/lux-theme.css");

for (const name of spec.requiredHeaderNames) {
  if (!spec.staticHeaders[name] && name !== "Content-Security-Policy") {
    fails.push("spec missing static " + name);
  }
}

const prodDoc = headerMap("document", { production: true });
const apiMap = headerMap("api", { production: true });
for (const name of spec.requiredHeaderNames) {
  if (!prodDoc[name]) fails.push("document missing " + name);
  if (!apiMap[name]) fails.push("api missing " + name);
}

if (prodDoc["X-Frame-Options"] !== "DENY") fails.push("X-Frame-Options must be DENY");
if (!String(prodDoc["Strict-Transport-Security"]).includes("max-age=")) {
  fails.push("HSTS must set max-age");
}
if (prodDoc["X-Content-Type-Options"] !== "nosniff") {
  fails.push("X-Content-Type-Options must be nosniff");
}

const prodCsp = prodDoc["Content-Security-Policy"];
const abuse = assertNoWildcardAbuse(prodCsp);
for (const a of abuse) fails.push("document CSP abuse: " + a);
for (const a of assertNoWildcardAbuse(apiMap["Content-Security-Policy"])) {
  fails.push("api CSP abuse: " + a);
}

for (const host of [
  spec.hosts.api,
  spec.hosts.app,
  spec.hosts.pretendard,
  spec.hosts.ebayImg,
  "https://*.r2.cloudflarestorage.com",
]) {
  if (!prodCsp.includes(host)) fails.push("document CSP missing " + host);
}
if (!prodCsp.includes("worker-src 'self'")) {
  fails.push("document CSP must keep worker-src 'self' for /sw.js");
}
if (!prodCsp.includes("frame-ancestors 'none'")) {
  fails.push("document CSP must lock frame-ancestors");
}
if (prodCsp.includes("'unsafe-eval'")) {
  fails.push("production CSP must not add unsafe-eval");
}
const destCsp = headerMap("document", { production: false })[
  "Content-Security-Policy"
];
if (!destCsp.includes("'unsafe-eval'")) {
  fails.push("non-production CSP must allow unsafe-eval for next dest hydrate");
}
if (assertNoWildcardAbuse(destCsp).some((a) => a !== "unsafe-eval")) {
  fails.push(
    "non-production CSP may only add dest unsafe-eval, not other wildcard abuse",
  );
}

const sources = nextSecurityHeaderSources({ production: true });
if (!Array.isArray(sources) || sources.length < 1) {
  fails.push("nextSecurityHeaderSources empty");
}

if (!webCfg.includes("nextSecurityHeaderSources")) {
  fails.push("apps/web/next.config.ts must apply nextSecurityHeaderSources");
}
if (!webCfg.includes("headers()")) {
  fails.push("apps/web/next.config.ts must define headers()");
}
if (!adminCfg.includes("nextSecurityHeaderSources")) {
  fails.push("apps/admin/next.config.ts must apply nextSecurityHeaderSources");
}
if (!adminCfg.includes("headers()")) {
  fails.push("apps/admin/next.config.ts must define headers()");
}

if (!main.includes("securityHeadersMiddleware")) {
  fails.push("api-nest main.ts must use securityHeadersMiddleware");
}
if (!mw.includes("applySecurityHeaders")) {
  fails.push("middleware must call applySecurityHeaders");
}
if (!mw.includes('"api"') && !mw.includes("'api'")) {
  fails.push("Nest must apply the api header profile");
}

if (!pwa.includes('navigator.serviceWorker.register("/sw.js"')) {
  fails.push("PWA must still register /sw.js");
}
if (!sw.includes("putduk-shell-v1")) {
  fails.push("sw.js must stay the native shell worker");
}
if (!theme.includes("cdn.jsdelivr.net/gh/orioncactus/pretendard")) {
  fails.push("lux-theme Pretendard host must stay listed in CSP via spec");
}

if (!pkg.includes("verify:rel-401-security-headers")) {
  fails.push("package.json missing verify:rel-401-security-headers");
}
if (!catalog.includes("rel-401-security-headers")) {
  fails.push("CATALOG missing rel-401-security-headers");
}

if (fs.existsSync(path.join(root, "apps/web/app/admin"))) {
  fails.push("apps/web must not grow /admin");
}

// Real HTTP smoke of the same builder Nest/web use.
function smoke() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      applySecurityHeaders(res, req.url === "/api" ? "api" : "document", {
        production: true,
      });
      res.end("ok");
    });
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      http
        .get({ host: "127.0.0.1", port, path: "/" }, (res) => {
          const missing = spec.requiredHeaderNames.filter(
            (name) => !res.headers[name.toLowerCase()],
          );
          if (missing.length) {
            fails.push("http smoke missing " + missing.join(","));
          }
          if (res.headers["x-frame-options"] !== "DENY") {
            fails.push("http smoke X-Frame-Options");
          }
          http
            .get({ host: "127.0.0.1", port, path: "/api" }, (apiRes) => {
              const apiCsp = apiRes.headers["content-security-policy"] || "";
              if (!apiCsp.includes("default-src 'none'")) {
                fails.push("api smoke CSP must be default-src none");
              }
              server.close();
              resolve();
            })
            .on("error", () => {
              fails.push("api_smoke_error");
              server.close();
              resolve();
            });
        })
        .on("error", () => {
          fails.push("http_smoke_error");
          server.close();
          resolve();
        });
    });
  });
}

void smoke().then(() => {
  if (fails.length) {
    console.error("[verify:rel-401-security-headers] FAIL");
    for (const f of fails) console.error(" -", sanitizeLogLine(f));
    process.exit(1);
  }
  console.log("[verify:rel-401-security-headers] PASS");
});
