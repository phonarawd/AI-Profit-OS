#!/usr/bin/env node
/**
 * Load .env.tron.local into process.env (no stdout of secrets).
 * Usage: node tooling/tron/load-env.cjs && …  OR require from smoke scripts.
 */
const {
  LOCAL_ENV_FILE,
  readEnvFile,
  maskStatus,
} = require("./lib/local-env.cjs");

function applyTronLocalEnv(opts = {}) {
  const map = readEnvFile(LOCAL_ENV_FILE);
  let applied = 0;
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    if (opts.overwrite !== true && process.env[k]) continue;
    process.env[k] = v;
    applied += 1;
  }
  return { applied, mask: maskStatus(map), file: LOCAL_ENV_FILE };
}

if (require.main === module) {
  const r = applyTronLocalEnv({ overwrite: true });
  process.stdout.write(
    JSON.stringify({ ok: true, applied: r.applied, mask: r.mask }) + "\n",
  );
}

module.exports = { applyTronLocalEnv, LOCAL_ENV_FILE };
