/**
 * verify:no-admin-in-web — §40 apps/web must not mount /admin
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const webApp = path.join(root, "apps/web/app");
const fails = [];

if (!fs.existsSync(webApp)) {
  console.error("[verify:no-admin-in-web] FAIL missing apps/web/app");
  process.exit(1);
}

const adminDir = path.join(webApp, "admin");
if (fs.existsSync(adminDir)) {
  fails.push("apps/web/app/admin/ must not exist");
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) {
      const t = fs.readFileSync(p, "utf8");
      // allow comments referencing Admin §40 forbid list in routes.ts
      if (p.endsWith(`${path.sep}routes.ts`) && t.includes("WEB_FORBIDDEN_PREFIXES")) continue;
      if (/href=\{?["'`]\/admin/.test(t) || /redirect\(["'`]\/admin/.test(t)) {
        fails.push(`${path.relative(root, p)}: /admin link`);
      }
    }
  }
}
walk(webApp);
const routes = path.join(root, "apps/web/routes.ts");
if (fs.existsSync(routes)) {
  const t = fs.readFileSync(routes, "utf8");
  if (!t.includes('"/admin"') || !t.includes("WEB_FORBIDDEN_PREFIXES")) {
    fails.push("apps/web/routes.ts must declare WEB_FORBIDDEN_PREFIXES including /admin");
  }
}

if (fails.length) {
  console.error("[verify:no-admin-in-web] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:no-admin-in-web] PASS");
