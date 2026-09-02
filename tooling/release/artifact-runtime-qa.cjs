"use strict";

/**
 * 출시 산출물을 실제로 기동해 health/smoke를 검증한다.
 * digest 대조만으로는 부족하다. exact worker.js / prebuilt를 실행한다.
 */
const fs = require("fs");
const path = require("path");
const {
  PREBUILT_DIR,
  WORKER_SNAPSHOTS,
  extractPayload,
  failClosed,
  findPrebuiltEntry,
  isSha256,
  normalizeHex,
  qaRecord,
  verifyBundle,
} = require("./artifact-provenance.cjs");

const OPENNEXT_ACCEPT = [200, 301, 302, 307, 308];
const WORKER_ACCEPT = [200];

function parseArgs(argv) {
  const out = { sha: "", bundle: "", extractRoot: "", out: "", optional: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--bundle") out.bundle = argv[i + 1] || "";
    if (argv[i] === "--extract-root") out.extractRoot = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
    if (argv[i] === "--optional") out.optional = true;
  }
  return out;
}

function surfacesForRoot(root) {
  return [
    {
      id: "web",
      kind: "opennext",
      script: path.join(root, "apps/web/.open-next/worker.js"),
      config: path.join(root, "infra/web/wrangler.toml"),
      route: "/",
      accept: OPENNEXT_ACCEPT,
    },
    {
      id: "ops",
      kind: "opennext",
      script: path.join(root, "apps/admin/.open-next/worker.js"),
      config: path.join(root, "infra/ops/wrangler.toml"),
      // ops `/` → 307 `/admin`; local unstable_dev에서 `/` fetch 실패가
      // 재현되므로 실제 렌더 경로 `/admin`을 직접 검증한다 (CF smoke=307/200).
      route: "/admin",
      accept: OPENNEXT_ACCEPT,
    },
    {
      id: "push-dispatcher",
      kind: "worker",
      scriptDir: path.join(root, "workers/push-dispatcher", PREBUILT_DIR),
      route: "/health",
      accept: WORKER_ACCEPT,
      vars: { SERVICE: "push-dispatcher", PHASE: "0", PUSH_ENABLED: "true" },
    },
    {
      id: "ebay-adapter",
      kind: "worker",
      scriptDir: path.join(root, "workers/ebay-adapter", PREBUILT_DIR),
      route: "/health",
      accept: WORKER_ACCEPT,
      vars: { SERVICE: "ebay-adapter", PHASE: "1" },
    },
  ];
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout:" + label)), ms);
    }),
  ]);
}

async function startDefaultWorker(surface) {
  let unstable_dev;
  try {
    ({ unstable_dev } = require("wrangler"));
  } catch {
    throw failClosed("FAIL_CLOSED:artifact_runtime_harness_missing");
  }
  const script = surface.script || findPrebuiltEntry(surface.scriptDir);
  const handle = await unstable_dev(script, {
    config: surface.config,
    noBundle: true,
    persist: false,
    local: true,
    logLevel: "error",
    compatibilityDate: "2025-03-01",
    compatibilityFlags: ["nodejs_compat"],
    vars: surface.vars,
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
    },
  });
  return {
    fetch: (input, init) => handle.fetch(input, init),
    stop: () => handle.stop(),
    harness: "wrangler.unstable_dev",
  };
}

function evaluateSurfaceResult(surface, result) {
  if (!result || result.error) {
    return { ok: false, reason: (result && result.error) || "runtime_error" };
  }
  if (!surface.accept.includes(result.status)) {
    return { ok: false, reason: "status_" + result.status };
  }
  if (surface.kind === "worker" && result.json && result.json.ok !== true) {
    return { ok: false, reason: "health_not_ok" };
  }
  return { ok: true };
}

function formatFetchError(err) {
  if (!err) return "runtime_error";
  const parts = [err.message || String(err)];
  if (err.cause && err.cause.message) parts.push("cause:" + err.cause.message);
  if (err.code) parts.push("code:" + err.code);
  return parts.join("|");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithReadyRetries(session, route, attempts) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await withTimeout(session.fetch("http://artifact.local" + route), 20000, "fetch:" + route);
    } catch (err) {
      lastErr = err;
      await sleep(400 * (i + 1));
    }
  }
  throw lastErr || new Error("fetch failed");
}

async function probeSurface(surface, startWorker) {
  let session;
  try {
    session = await withTimeout(startWorker(surface), 120000, "start:" + surface.id);
    // miniflare 기동 직후 첫 요청 race 방지
    await sleep(250);
    const res = await fetchWithReadyRetries(session, surface.route, 5);
    const status = res.status;
    let json = null;
    let text = "";
    try {
      text = await res.text();
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const judged = evaluateSurfaceResult(surface, { status, json });
    return {
      id: surface.id,
      kind: surface.kind,
      route: surface.route,
      status,
      ok: judged.ok,
      reason: judged.ok ? "pass" : judged.reason,
      harness: session.harness || "injected",
      no_bundle: true,
    };
  } catch (err) {
    return {
      id: surface.id,
      kind: surface.kind,
      route: surface.route,
      ok: false,
      reason: formatFetchError(err),
      no_bundle: true,
    };
  } finally {
    if (session && typeof session.stop === "function") {
      try {
        await session.stop();
      } catch {
        /* 기동 실패 후 정리는 무시 */
      }
    }
    // surface 간 port/registry 잔여 race 방지
    await sleep(300);
  }
}

function summarizeRuntime(digest, surfaces) {
  const verified = surfaces.length > 0 && surfaces.every((item) => item.ok === true);
  return {
    verified,
    artifact_digest: digest,
    harness: "wrangler.unstable_dev",
    no_bundle: true,
    surfaces,
  };
}

function readExistingQa(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeOut(filePath, record) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2) + "\n");
}

async function runRuntimeQa(opts) {
  const startWorker = opts.startWorker || startDefaultWorker;
  const surfaces = opts.surfaces || surfacesForRoot(opts.extractRoot);
  const results = [];
  for (const surface of surfaces) {
    results.push(await probeSurface(surface, startWorker));
  }
  return summarizeRuntime(opts.digest, results);
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.bundle || !args.out) {
    process.stderr.write(
      "usage: artifact-runtime-qa.cjs --bundle <dir> --out <file> [--sha <40hex>] [--extract-root <dir>] [--optional]\n",
    );
    process.exit(2);
  }
  const bundleDir = path.resolve(args.bundle);
  const outFile = path.resolve(args.out);
  const existing = readExistingQa(outFile);
  if (!fs.existsSync(bundleDir)) {
    const record = qaRecord(false, {
      source_sha: args.sha || (existing && existing.source_sha) || "",
      reason: "artifact_missing",
      runtime: { verified: false, reason: "artifact_missing" },
    });
    writeOut(outFile, record);
    if (args.optional) return;
    process.stderr.write("[artifact-runtime-qa] FAIL_CLOSED\n- FAIL_CLOSED:artifact_missing\n");
    process.exit(1);
  }
  let bound;
  try {
    bound = verifyBundle(bundleDir, args.sha ? { sourceSha: args.sha } : undefined);
  } catch (err) {
    const fails = err && err.fails ? err.fails : ["FAIL_CLOSED:" + (err && err.message ? err.message : err)];
    const record = qaRecord(false, {
      source_sha: args.sha,
      reason: fails[0],
      fails,
      runtime: { verified: false, reason: fails[0] },
    });
    writeOut(outFile, record);
    if (args.optional) return;
    process.stderr.write("[artifact-runtime-qa] FAIL_CLOSED\n- " + fails.join("\n- ") + "\n");
    process.exit(1);
  }
  const extractRoot = path.resolve(args.extractRoot || path.resolve(__dirname, "../.."));
  extractPayload(bundleDir, extractRoot);
  const runtime = await runRuntimeQa({
    digest: bound.digest,
    extractRoot,
    startWorker: startDefaultWorker,
  });
  const missing = WORKER_SNAPSHOTS.filter((name) => !runtime.surfaces.some((item) => item.id === name && item.ok));
  if (missing.length && runtime.verified) {
    runtime.verified = false;
    runtime.reason = "worker_runtime_incomplete";
  }
  const record = qaRecord(true, {
    source_sha: bound.source_sha,
    artifact_digest: bound.digest,
    built_once: true,
    runtime,
  });
  if (!isSha256(normalizeHex(record.artifact_digest)) || normalizeHex(record.artifact_digest) !== bound.digest) {
    record.verified = false;
    record.runtime = { verified: false, reason: "digest_mismatch" };
  }
  writeOut(outFile, record);
  process.stdout.write(JSON.stringify(record, null, 2) + "\n");
  if (!runtime.verified) {
    if (args.optional) return;
    process.stderr.write("[artifact-runtime-qa] FAIL_CLOSED\n- FAIL_CLOSED:artifact_runtime_qa_failed\n");
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv).catch((err) => {
    process.stderr.write("[artifact-runtime-qa] FAIL_CLOSED:" + (err && err.message ? err.message : err) + "\n");
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  surfacesForRoot,
  evaluateSurfaceResult,
  summarizeRuntime,
  runRuntimeQa,
  OPENNEXT_ACCEPT,
};
