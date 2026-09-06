/**
 * verify:admin-code-exchange-isolation — §1.5
 * 연결 코드는 정식 로그인이 아니다. production 기본 OFF.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const flag = read("services/api-nest/src/common/admin-code-exchange.ts");
if (!flag.includes('AIPO_ADMIN_CODE_EXCHANGE_ENABLED') || !flag.includes('=== "true"')) {
  fail("code exchange must default OFF unless AIPO_ADMIN_CODE_EXCHANGE_ENABLED=true");
}

const ctl = read("services/api-nest/src/common/admin-session.controller.ts");
if (!ctl.includes("planAdminCodeExchange") || !ctl.includes("consumeAdminCodeExchange")) {
  fail("exchange must plan+consume so the same JWT cannot be reused");
}
if (!ctl.includes("ADMIN_CODE_EXCHANGE_DISABLED")) {
  fail("disabled exchange must fail closed");
}

const guard = read("services/api-nest/src/common/admin.guard.ts");
if (!guard.includes("resolveAdminRbac") || !guard.includes("ADMIN_RBAC_INACTIVE")) {
  fail("AdminGuard must deny inactive/missing admin_rbac when lookup is wired");
}

const bar = read("apps/admin/components/AdminSessionBar.tsx");
if (!bar.includes("NEXT_PUBLIC_ADMIN_CODE_EXCHANGE_ENABLED")) {
  fail("AdminSessionBar must hide connection-code form unless the public flag is true");
}
if (bar.includes("localStorage") || bar.includes("sessionStorage")) {
  fail("AdminSessionBar must not store codes in web storage");
}

const sessionLib = read("apps/admin/lib/admin-session.ts");
if (sessionLib.includes("localStorage") || sessionLib.includes("sessionStorage")) {
  fail("admin-session lib must not store bearer in web storage");
}

const adminApp = [
  "apps/admin/app",
  "apps/admin/components",
  "apps/admin/lib",
];
let passwordLogin = false;
for (const dir of adminApp) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const child = path.join(d, ent.name);
      if (ent.isDirectory()) walk(child);
      else if (/\.(ts|tsx)$/.test(ent.name)) {
        const src = fs.readFileSync(child, "utf8");
        if (/admin\/login/.test(src) && /password/.test(src) && /type="password"/.test(src) && /identifier/.test(src)) {
          passwordLogin = true;
        }
      }
    }
  };
  walk(abs);
}
if (passwordLogin) {
  fail("do not invent a product admin password login in this isolation slice");
}

const manifest = read("infra/domain.manifest.json");
if (!manifest.includes("workers.dev")) {
  fail("record ops workers.dev origin so direct-origin bypass stays visible");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:admin-code-exchange-isolation"')) {
  fail("package.json missing verify:admin-code-exchange-isolation");
}

if (fails.length) {
  console.error("[verify:admin-code-exchange-isolation] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:admin-code-exchange-isolation] PASS (exchange default OFF · one-time consume · rbac lookup · no invented password login)",
);
