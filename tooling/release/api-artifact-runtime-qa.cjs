"use strict";

/**
 * Exact bundled Nest API runtime acceptance.
 * Starts services/api-nest/dist/main.js extracted from the immutable release bundle,
 * probes /api/v1/health, and requires exact RENDER_GIT_COMMIT provenance.
 * No Production network/provider dependency: DB/Redis/provider env is explicitly blanked.
 */

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const {
  extractPayload,
  isFullSha,
  isSha256,
  normalizeHex,
  qaRecord,
  verifyBundle,
} = require("./artifact-provenance.cjs");

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      server.close((err) => {
        if (err) reject(err);
        else if (!port) reject(new Error("free_port_unavailable"));
        else resolve(port);
      });
    });
  });
}

function runtimeEnv(sourceSha, port) {
  return {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    ROOT_DOMAIN: "localhost",
    APP_HOST: "localhost:3000",
    OPS_HOST: "localhost:3001",
    API_HOST: "localhost:" + String(port),
    RENDER_GIT_COMMIT: sourceSha,
    DATABASE_URL: "",
    REDIS_URL: "",
    SUPABASE_URL: "",
    SUPABASE_REGION: "",
    SUPABASE_PROJECT_REF: "",
    LLM_PROVIDER: "none",
    LLM_API_KEY: "",
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    GROQ_API_KEY: "",
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "",
  };
}

function appendBounded(current, chunk, limit = 12000) {
  const next = current + String(chunk || "");
  return next.length <= limit ? next : next.slice(next.length - limit);
}

async function stopChild(child) {
  if (!child || child.exitCode != null) return;
  child.kill("SIGTERM");
  for (let i = 0; i < 20; i += 1) {
    if (child.exitCode != null) return;
    await delay(100);
  }
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function probeApi(entry, root, sourceSha, opts) {
  const port = opts && opts.port ? opts.port : await freePort();
  let stdout = "";
  let stderr = "";
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: runtimeEnv(sourceSha, port),
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => { stdout = appendBounded(stdout, d); });
  child.stderr.on("data", (d) => { stderr = appendBounded(stderr, d); });

  const url = "http://127.0.0.1:" + String(port) + "/api/v1/health";
  const deadline = Date.now() + ((opts && opts.timeoutMs) || 45000);

  try {
    while (Date.now() < deadline) {
      if (child.exitCode != null) {
        throw new Error(
          "api_process_exited:" + child.exitCode + ":" + (stderr || stdout).slice(-2000),
        );
      }
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (res.status === 200) {
          const body = await res.json();
          return { status: res.status, body, harness: "node-child-process" };
        }
      } catch {
        // Boot race: retry until deadline or process exit.
      }
      await delay(200);
    }
    throw new Error("api_health_timeout");
  } finally {
    await stopChild(child);
  }
}

function evaluateApiHealth(result, sourceSha) {
  if (!result || result.status !== 200 || !result.body || typeof result.body !== "object") {
    return { ok: false, reason: "api_health_unavailable" };
  }
  const body = result.body;
  if (body.ok !== true) return { ok: false, reason: "api_health_not_ok" };
  if (body.service !== "api-nest") return { ok: false, reason: "api_service_mismatch" };
  if (normalizeHex(body.gitSha) !== normalizeHex(sourceSha)) {
    return { ok: false, reason: "api_git_sha_mismatch" };
  }
  if (body.gitShaSource !== "RENDER_GIT_COMMIT") {
    return { ok: false, reason: "api_git_sha_source_mismatch" };
  }
  return { ok: true };
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

async function runApiArtifactRuntimeQa(opts) {
  const bundleDir = path.resolve(opts.bundle);
  const extractRoot = path.resolve(opts.extractRoot);
  const bound = verifyBundle(bundleDir, { sourceSha: opts.sha });
  if (!bound.api_artifact || bound.api_artifact.artifact_kind !== "api-nest") {
    throw new Error("FAIL_CLOSED:api_artifact_missing");
  }
  if (!isSha256(normalizeHex(bound.api_artifact.artifact_digest))) {
    throw new Error("FAIL_CLOSED:api_artifact_digest_missing");
  }

  extractPayload(bundleDir, extractRoot);
  const entry = path.join(extractRoot, "services/api-nest/dist/main.js");
  if (!fs.existsSync(entry)) {
    throw new Error("FAIL_CLOSED:api_artifact_entry_missing");
  }

  const probe = await (opts.probeApi || probeApi)(
    entry,
    extractRoot,
    bound.source_sha,
    opts.probeOptions,
  );
  const judged = evaluateApiHealth(probe, bound.source_sha);

  return {
    verified: judged.ok,
    reason: judged.ok ? "pass" : judged.reason,
    harness: probe && probe.harness ? probe.harness : "injected",
    route: "/api/v1/health",
    status: probe && probe.status != null ? probe.status : null,
    service: probe && probe.body ? probe.body.service || null : null,
    git_sha: probe && probe.body ? normalizeHex(probe.body.gitSha) || null : null,
    git_sha_source: probe && probe.body ? probe.body.gitShaSource || null : null,
    source_sha: bound.source_sha,
    bundle_digest: bound.digest,
    api_artifact_digest: normalizeHex(bound.api_artifact.artifact_digest),
  };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!isFullSha(normalizeHex(args.sha)) || !args.bundle || !args.out) {
    process.stderr.write(
      "usage: api-artifact-runtime-qa.cjs --sha <40hex> --bundle <dir> --out <file> [--extract-root <dir>] [--optional]\n",
    );
    process.exit(2);
  }

  const outFile = path.resolve(args.out);
  const existing = readExistingQa(outFile);
  let apiRuntime;
  try {
    apiRuntime = await runApiArtifactRuntimeQa({
      sha: normalizeHex(args.sha),
      bundle: args.bundle,
      extractRoot: args.extractRoot || path.resolve(__dirname, "../.."),
    });
  } catch (err) {
    apiRuntime = {
      verified: false,
      reason: err && err.message ? err.message : String(err),
      source_sha: normalizeHex(args.sha),
    };
  }

  const record = existing && typeof existing === "object"
    ? { ...existing }
    : qaRecord(apiRuntime.verified === true, {
        source_sha: normalizeHex(args.sha),
        built_once: true,
      });

  record.api_runtime = apiRuntime;
  if (apiRuntime.verified !== true) record.verified = false;
  if (!record.source_sha) record.source_sha = normalizeHex(args.sha);
  writeOut(outFile, record);
  process.stdout.write(JSON.stringify(record, null, 2) + "\n");

  if (apiRuntime.verified !== true) {
    if (args.optional) return;
    process.stderr.write(
      "[api-artifact-runtime-qa] FAIL_CLOSED:" + String(apiRuntime.reason || "api_runtime_failed") + "\n",
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv).catch((err) => {
    process.stderr.write(
      "[api-artifact-runtime-qa] FAIL_CLOSED:" +
        (err && err.message ? err.message : String(err)) +
        "\n",
    );
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  freePort,
  runtimeEnv,
  probeApi,
  evaluateApiHealth,
  runApiArtifactRuntimeQa,
};
