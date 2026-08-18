/**
 * verify:admin-boundary — QA8_ADMIN_BOUNDARY P0 regression gate.
 *
 * 1. every *.admin.controller.ts carries @UseGuards(AdminGuard)
 * 2. AppModule registers AdminGuard as a global APP_GUARD (new controllers are contained)
 * 3. the deny-by-default capability table classifies exactly the discovered handlers
 *    (no uncovered route, no stale entry) using canonical schemas/admin-rbac.v1.json names
 * 4. real Nest + HTTP adversarial round-trip (dist/common/admin-guard.selftest.js)
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function walkAdminControllers() {
  const out = [];
  const srcAbs = path.join(root, "services/api-nest/src");
  (function walk(abs, rel) {
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      const childAbs = path.join(abs, ent.name);
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(childAbs, childRel);
      else if (ent.name.endsWith(".admin.controller.ts")) {
        out.push(`services/api-nest/src/${childRel}`);
      }
    }
  })(srcAbs, "");
  return out.sort();
}

/** Handler names per controller class, derived from @Get/@Post/... decorators. */
function handlersOf(text) {
  const lines = text.split("\n");
  const handlers = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*@(Get|Post|Put|Patch|Delete)\(/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && /^\s*@/.test(lines[j])) j++;
    const m = (lines[j] || "").trim().match(/^(?:async\s+)?(\w+)\s*\(/);
    if (m) handlers.push(m[1]);
    else fails.push(`could not resolve handler name near line ${i + 1}`);
  }
  return handlers;
}

const controllers = walkAdminControllers();
if (controllers.length === 0) {
  fails.push("no *.admin.controller.ts discovered — inventory oracle broken");
}

// ── 1. local guard metadata on every admin controller ──
const discovered = new Map();
for (const rel of controllers) {
  const text = read(rel);
  if (!/@UseGuards\(AdminGuard\)/.test(text)) {
    fails.push(`${rel}: missing @UseGuards(AdminGuard)`);
  }
  if (!/from\s+"\.\.\/common\/admin\.guard"/.test(text)) {
    fails.push(`${rel}: AdminGuard not imported from common/admin.guard`);
  }
  // Operator identity must come from the verified token, never the request body.
  const spoofable = text.match(
    /body\.(adminId|updatedByAdminId|createdByAdminId|createdBy|decidedByAdminId)\b/g,
  );
  if (spoofable) {
    fails.push(
      `${rel}: reads operator identity from the request body (${[...new Set(spoofable)].join(", ")}) — use @AdminOperator()`,
    );
  }
  const cls = (text.match(/export class (\w+)/) || [])[1];
  if (!cls) {
    fails.push(`${rel}: cannot resolve controller class name`);
    continue;
  }
  discovered.set(cls, { rel, handlers: handlersOf(text) });
}

// ── 2. global APP_GUARD containment ──
const appModule = read("services/api-nest/src/app.module.ts");
if (!/APP_GUARD/.test(appModule) || !/useClass:\s*AdminGuard/.test(appModule)) {
  fails.push(
    "app.module.ts must register { provide: APP_GUARD, useClass: AdminGuard }",
  );
}

// ── 3. capability table covers exactly the discovered handlers ──
const policySrc = read("services/api-nest/src/common/admin-capabilities.ts");
const rbacSchemaPath = path.join(root, "schemas/admin-rbac.v1.json");
let vocabulary = new Set();
try {
  const schema = JSON.parse(fs.readFileSync(rbacSchemaPath, "utf8"));
  for (const role of schema.default.roles) {
    for (const cap of Object.keys(role.capabilities || {})) vocabulary.add(cap);
  }
} catch (e) {
  fails.push(`schemas/admin-rbac.v1.json unreadable: ${e.message}`);
}

/** Parse ADMIN_CAPABILITY_POLICY without executing TypeScript. */
function parsePolicy(src) {
  const start = src.indexOf("ADMIN_CAPABILITY_POLICY");
  const map = new Map();
  if (start < 0) {
    fails.push("admin-capabilities.ts: ADMIN_CAPABILITY_POLICY not found");
    return map;
  }
  const body = src.slice(start);
  const ctrlRe = /^\s{2}(\w+):\s*\{$/gm;
  let m;
  while ((m = ctrlRe.exec(body))) {
    const cls = m[1];
    const rest = body.slice(m.index + m[0].length);
    const end = rest.indexOf("\n  },");
    const block = end >= 0 ? rest.slice(0, end) : "";
    const handlers = new Map();
    const hRe = /^\s{4}(\w+):\s*(read|write)\("([A-Za-z]+)"\),/gm;
    let h;
    while ((h = hRe.exec(block))) handlers.set(h[1], { level: h[2], capability: h[3] });
    map.set(cls, handlers);
  }
  return map;
}

const policy = parsePolicy(policySrc);

for (const [cls, info] of discovered) {
  const entry = policy.get(cls);
  if (!entry) {
    fails.push(`${info.rel}: ${cls} has no ADMIN_CAPABILITY_POLICY entry (routes would 403)`);
    continue;
  }
  for (const handler of info.handlers) {
    const req = entry.get(handler);
    if (!req) {
      fails.push(`${cls}.${handler}: unclassified admin route (deny-by-default would block it)`);
      continue;
    }
    if (vocabulary.size && !vocabulary.has(req.capability)) {
      fails.push(
        `${cls}.${handler}: capability "${req.capability}" is not in schemas/admin-rbac.v1.json vocabulary`,
      );
    }
  }
  for (const handler of entry.keys()) {
    if (!info.handlers.includes(handler)) {
      fails.push(`${cls}.${handler}: stale capability entry (no such route handler)`);
    }
  }
}
for (const cls of policy.keys()) {
  if (!discovered.has(cls)) {
    fails.push(`ADMIN_CAPABILITY_POLICY.${cls}: no such admin controller`);
  }
}

const totalHandlers = [...discovered.values()].reduce(
  (n, c) => n + c.handlers.length,
  0,
);

// ── 4. real Nest HTTP adversarial round-trip ──
if (fails.length === 0) {
  const tscBin = require.resolve("typescript/bin/tsc");
  const build = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(build.stdout || "");
  process.stderr.write(build.stderr || "");
  if (build.status !== 0) {
    fails.push("services/api-nest tsc build failed — cannot run admin-guard.selftest");
  } else {
    const selftestJs = path.join(
      root,
      "services/api-nest/dist/common/admin-guard.selftest.js",
    );
    if (!fs.existsSync(selftestJs)) {
      fails.push(`missing compiled selftest: ${selftestJs}`);
    } else {
      const run = spawnSync(process.execPath, [selftestJs], {
        cwd: root,
        encoding: "utf8",
        timeout: 60_000,
      });
      process.stdout.write(run.stdout || "");
      process.stderr.write(run.stderr || "");
      if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
        fails.push(
          "admin-guard.selftest did not report ALL PASS (real Nest HTTP admin boundary failed)",
        );
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:admin-boundary] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:admin-boundary] PASS (${controllers.length} admin controllers · ${totalHandlers} routes classified · global APP_GUARD · real Nest HTTP adversarial round-trip)`,
);
