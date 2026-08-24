/**
 * REL-601 staging surface regression.
 * preview workers only. production host 0. pixel-diff alone 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const MATRIX_PATH = path.join(
  ROOT,
  "tooling/e2e/expansion/staging-regression-matrix.v1.json",
);

const PRODUCTION_HOST_FRAGMENTS = [
  "app.hiptk.app",
  "ops.hiptk.app",
  "api.hiptk.app",
  "ai-profit-web.ebay-adapter.workers.dev",
  "ai-profit-ops.ebay-adapter.workers.dev",
];

function loadMatrix() {
  const raw = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  if (raw.version !== 1) throw new Error("staging-regression: version must be 1");
  if (raw.homeGeometryPatch !== 0) {
    throw new Error("staging-regression: Home geometry patch forbidden");
  }
  if (raw.pixelDiffAloneFail !== 0) {
    throw new Error("staging-regression: pixel-diff alone fail forbidden");
  }
  if (raw.productionHost !== 0) {
    throw new Error("staging-regression: productionHost must be 0");
  }
  if (raw.mcpOnlyDone !== 0) {
    throw new Error("staging-regression: MCP-only must not be DONE");
  }
  if (!raw.origins || !raw.origins.web || !raw.origins.ops) {
    throw new Error("staging-regression: origins.web/ops required");
  }
  assertStagingOrigin(raw.origins.web, "web");
  assertStagingOrigin(raw.origins.ops, "ops");
  if (!Array.isArray(raw.surfaces) || raw.surfaces.length < 40) {
    throw new Error("staging-regression: surface matrix too small");
  }
  return raw;
}

function assertStagingOrigin(url, label) {
  const host = new URL(url).hostname.toLowerCase();
  if (!host.includes("-preview.ebay-adapter.workers.dev")) {
    throw new Error(`staging-regression: ${label} origin must be preview workers.dev`);
  }
  for (const frag of PRODUCTION_HOST_FRAGMENTS) {
    if (host === frag || host.endsWith(`.${frag}`)) {
      throw new Error(`staging-regression: production host denied (${host})`);
    }
  }
}

function originFor(matrix, app) {
  const origin = matrix.origins[app];
  if (!origin) throw new Error("unknown app " + app);
  return origin.replace(/\/$/, "");
}

async function fetchSurface(matrix, surface) {
  const url = originFor(matrix, surface.app) + surface.route;
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-601-regression/1" },
  });
  const body =
    res.status < 500 && res.headers.get("content-type")?.includes("text")
      ? await res.text()
      : "";
  return { url, status: res.status, headers: res.headers, body };
}

function assertSurfaceResult(surface, result) {
  const issues = [];
  if (result.status >= 500) {
    issues.push("status " + result.status);
  }
  if (!surface.okStatus.includes(result.status)) {
    issues.push("unexpected status " + result.status + " want " + surface.okStatus.join("|"));
  }
  if (surface.app === "web" && result.status === 200) {
    const xon = result.headers.get("x-opennext");
    if (xon !== "1") issues.push("missing x-opennext=1");
  }
  if (surface.app === "ops" && [200, 307, 308].includes(result.status)) {
    const xon = result.headers.get("x-opennext");
    if (!xon && result.status === 200) issues.push("missing x-opennext on ops 200");
  }
  for (const marker of surface.markers || []) {
    if (marker && result.body && !result.body.includes(marker)) {
      issues.push("marker missing " + marker);
    }
  }
  return issues;
}

async function fetchAsset(matrix, asset) {
  const url = originFor(matrix, asset.app) + asset.path;
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-601-regression/1" },
  });
  let body = "";
  if (asset.expect === "json" && res.status === 200) {
    body = await res.text();
    try {
      JSON.parse(body);
    } catch {
      return { url, status: res.status, issues: ["invalid json"] };
    }
  }
  const issues = [];
  if (res.status >= 500 || res.status === 404) {
    issues.push("status " + res.status);
  }
  if (asset.expect === "image" && res.status === 200) {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("image")) issues.push("content-type not image");
  }
  return { url, status: res.status, issues };
}

async function runHttpRegression(matrix = loadMatrix()) {
  const rows = [];
  let failCount = 0;

  for (const surface of matrix.surfaces) {
    const result = await fetchSurface(matrix, surface);
    const issues = assertSurfaceResult(surface, result);
    if (issues.length) failCount += 1;
    rows.push({
      kind: "surface",
      id: surface.id,
      route: surface.route,
      app: surface.app,
      rel: surface.rel,
      status: result.status,
      pass: issues.length === 0,
      issues,
    });
  }

  for (const asset of matrix.assets || []) {
    const result = await fetchAsset(matrix, asset);
    if (result.issues.length) failCount += 1;
    rows.push({
      kind: "asset",
      id: asset.id,
      route: asset.path,
      app: asset.app,
      status: result.status,
      pass: result.issues.length === 0,
      issues: result.issues,
    });
  }

  return {
    rel: "REL-601",
    at: new Date().toISOString(),
    origins: matrix.origins,
    surfaceCount: matrix.surfaces.length,
    assetCount: (matrix.assets || []).length,
    passCount: rows.filter((r) => r.pass).length,
    failCount,
    rows,
    pass: failCount === 0,
  };
}

function assertMatrixContract(matrix) {
  const issues = [];
  const ids = new Set();
  for (const surface of matrix.surfaces) {
    if (!surface.id || !surface.route || !surface.app) {
      issues.push("surface missing id/route/app");
      continue;
    }
    if (ids.has(surface.id)) issues.push("duplicate surface id " + surface.id);
    ids.add(surface.id);
    if (surface.route.startsWith("/dev/")) {
      issues.push("dev route forbidden in staging matrix: " + surface.route);
    }
  }
  const homeVp = matrix.homeViewports || [];
  const required = [390, 1440, 2560, 3440, 3840];
  for (const w of required) {
    if (!homeVp.some((vp) => vp.width === w)) {
      issues.push("home viewport missing width " + w);
    }
  }
  return issues;
}

module.exports = {
  MATRIX_PATH,
  PRODUCTION_HOST_FRAGMENTS,
  loadMatrix,
  assertStagingOrigin,
  originFor,
  fetchSurface,
  assertSurfaceResult,
  fetchAsset,
  runHttpRegression,
  assertMatrixContract,
};
