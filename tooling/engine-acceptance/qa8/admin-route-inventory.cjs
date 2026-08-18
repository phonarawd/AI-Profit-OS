/**
 * 실제 Nest admin HTTP 인벤토리 — *.admin.controller.ts + route 상수 파생.
 * 컨트롤러 개수를 상수로 고정하지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");

const SRC = path.join(ROOT, "services/api-nest/src");
const API_PREFIX = "/api/v1/admin";

function walk(abs, rel, out) {
  if (!fs.existsSync(abs)) return;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist") continue;
    const childAbs = path.join(abs, ent.name);
    const childRel = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) walk(childAbs, childRel, out);
    else if (ent.isFile()) out.push({ abs: childAbs, rel: `services/api-nest/src/${childRel}` });
  }
}

function findAdminControllers() {
  const files = [];
  walk(SRC, "", files);
  return files
    .filter((f) => f.rel.endsWith(".admin.controller.ts"))
    .sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

function parseConstObject(text) {
  const map = {};
  const re = /(\w+)\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) {
    map[m[1]] = m[2];
  }
  return map;
}

function loadNearbyRouteMaps(controllerRel) {
  const dir = path.dirname(path.join(ROOT, controllerRel));
  const maps = {};
  if (!fs.existsSync(dir)) return maps;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".ts")) continue;
    if (!/routes/i.test(name) && !/admin/i.test(name)) continue;
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    const objRe = /export const ([A-Z0-9_]+)\s*=\s*\{([\s\S]*?)\}\s*as const/g;
    let m;
    while ((m = objRe.exec(text))) {
      maps[m[1]] = parseConstObject(m[2]);
    }
  }
  return maps;
}

const DECORATOR_RE =
  /@(Get|Post|Put|Patch|Delete)\(\s*(?:([A-Z0-9_]+)\.(\w+)|"([^"]*)")\s*\)/g;

function inventoryAdminRoutes() {
  const controllers = findAdminControllers();
  const routes = [];
  for (const c of controllers) {
    const text = fs.readFileSync(c.abs, "utf8");
    if (!/@Controller\(\s*"admin"\s*\)/.test(text) && !/@Controller\(\s*'admin'\s*\)/.test(text)) {
      continue;
    }
    const maps = loadNearbyRouteMaps(c.rel);
    DECORATOR_RE.lastIndex = 0;
    let m;
    while ((m = DECORATOR_RE.exec(text))) {
      const method = m[1].toUpperCase();
      let relPath = m[4] || "";
      if (m[2] && m[3]) {
        const table = maps[m[2]] || {};
        relPath = table[m[3]] || `${m[2]}.${m[3]}`;
      }
      const full = `${API_PREFIX}/${String(relPath).replace(/^\//, "")}`;
      routes.push({
        method,
        path: full,
        rel_path: relPath,
        controller: c.rel,
        has_use_guards: /@UseGuards\(/.test(text),
      });
    }
  }

  const byController = {};
  for (const r of routes) {
    byController[r.controller] = (byController[r.controller] || 0) + 1;
  }

  return {
    schema: "harness.admin-route-inventory.v1",
    api_prefix: API_PREFIX,
    controller_count: controllers.length,
    route_count: routes.length,
    controllers: controllers.map((c) => c.rel),
    routes,
    routes_per_controller: byController,
  };
}

function coverageDrift(inventory, caseRoutes) {
  const coveredControllers = new Set();
  const caseSet = new Set((caseRoutes || []).map((c) => `${c.method} ${c.path}`));
  const uncovered = [];
  for (const r of inventory.routes) {
    const key = `${r.method} ${r.path}`;
    const prefixHit = (caseRoutes || []).some(
      (c) => r.path === c.path || (c.path_prefix && r.path.startsWith(c.path_prefix)),
    );
    if (caseSet.has(key) || prefixHit) {
      coveredControllers.add(r.controller);
    } else {
      uncovered.push(r);
    }
  }
  const controllersMissing = inventory.controllers.filter((c) => !coveredControllers.has(c));
  return {
    uncovered_routes: uncovered,
    controllers_without_case: controllersMissing,
    drift: controllersMissing.length > 0,
  };
}

module.exports = {
  findAdminControllers,
  inventoryAdminRoutes,
  coverageDrift,
  API_PREFIX,
};
