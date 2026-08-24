/** Cloudflare Workers wrangler helpers (REL-602 version control) */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { root, isProdTarget, resolveWranglerEnv, requireCloudflareCreds } = require("./env.cjs");

const SURFACES = {
  web: {
    config: "infra/web/wrangler.toml",
    stagingWorker: "ai-profit-web-preview",
    productionWorker: "ai-profit-web",
  },
  ops: {
    config: "infra/ops/wrangler.toml",
    stagingWorker: "ai-profit-ops-preview",
    productionWorker: "ai-profit-ops",
  },
};

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(root, "infra/domain.manifest.json"), "utf8"));
}

function resolveSlot(slot) {
  return slot === "production" || slot === "prod" ? "production" : "staging";
}

function surfaceConfig(surface) {
  const cfg = SURFACES[surface];
  if (!cfg) throw new Error("unknown surface: " + surface + " (web|ops)");
  return cfg;
}

function workerName(surface, slot) {
  const cfg = surfaceConfig(surface);
  return resolveSlot(slot) === "production" ? cfg.productionWorker : cfg.stagingWorker;
}

function wranglerConfigPath(surface) {
  return path.join(root, surfaceConfig(surface).config);
}

function wranglerEnvFlag(slot) {
  return resolveWranglerEnv(resolveSlot(slot) === "production" ? "production" : "staging");
}

function runWrangler(surface, slot, subcommand) {
  requireCloudflareCreds();
  const configPath = wranglerConfigPath(surface);
  const envFlag = wranglerEnvFlag(slot);
  const args = [
    "exec",
    "wrangler",
    ...subcommand,
    "--config=" + configPath,
    "--env=" + envFlag,
  ];
  const run = spawnSync("pnpm", args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  return {
    status: run.status || 0,
    stdout: String(run.stdout || ""),
    stderr: String(run.stderr || ""),
  };
}

function parseJson(stdout, label) {
  const text = String(stdout || "").trim();
  if (!text) throw new Error(label + ": empty wrangler output");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(label + ": invalid JSON — " + e.message);
  }
}

function deploymentStatus(surface, slot) {
  const run = runWrangler(surface, slot, ["deployments", "status", "--json"]);
  if (run.status !== 0) {
    throw new Error(
      "deployments status failed (" +
        surface +
        "): " +
        (run.stderr || run.stdout || "").trim()
    );
  }
  return parseJson(run.stdout, "deployments status");
}

function versionsList(surface, slot) {
  const run = runWrangler(surface, slot, ["versions", "list", "--json"]);
  if (run.status !== 0) {
    throw new Error(
      "versions list failed (" + surface + "): " + (run.stderr || run.stdout || "").trim()
    );
  }
  return parseJson(run.stdout, "versions list");
}

function rollback(surface, slot, versionId, message) {
  if (isProdTarget(slot)) {
    throw new Error("production rollback blocked — use REL-701 HUMAN deploy path only");
  }
  const id = String(versionId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("invalid Cloudflare version id: " + id);
  }
  const msg = (message || "REL-602-staging-rollback-practice").replace(/\s+/g, "-");
  const run = runWrangler(surface, slot, ["rollback", id, "--message", msg]);
  if (run.status !== 0) {
    throw new Error("rollback failed: " + (run.stderr || run.stdout || "").trim());
  }
  return { versionId: id, message: msg, output: (run.stdout || run.stderr || "").trim() };
}

function activeVersionId(status) {
  if (!status) return "";
  if (status.version_id) return String(status.version_id);
  if (status.versions && status.versions[0] && status.versions[0].version_id) {
    return String(status.versions[0].version_id);
  }
  if (status.deployment && status.deployment.version_id) {
    return String(status.deployment.version_id);
  }
  return "";
}

module.exports = {
  SURFACES,
  loadManifest,
  resolveSlot,
  surfaceConfig,
  workerName,
  wranglerConfigPath,
  wranglerEnvFlag,
  runWrangler,
  deploymentStatus,
  versionsList,
  rollback,
  activeVersionId,
};
