/**
 * Nest API 산출물은 web OpenNext 산출물과 다르다.
 * WEB_ARTIFACT_ACCEPTED == API_ARTIFACT_ACCEPTED 금지.
 * 레지스트리/유료 인프라는 BLOCKED_EXTERNAL_ACTION.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SCHEMA = "api-nest-artifact-manifest.v1";
const ARTIFACT_KIND = "api-nest";
const WEB_KIND = "web-open-next";
const ENTRY = "services/api-nest/dist/main.js";

function isFullSha(value) {
  return /^[0-9a-f]{40}$/.test(String(value || "").toLowerCase());
}

function fileSha256(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

function apiArtifactAcceptedNeverEqualsWeb() {
  return {
    WEB_ARTIFACT_ACCEPTED: false,
    API_ARTIFACT_ACCEPTED: false,
    inequality: "WEB_ARTIFACT_ACCEPTED != API_ARTIFACT_ACCEPTED",
    registry: "BLOCKED_EXTERNAL_ACTION",
  };
}

function writeApiManifest(outDir, sourceSha, entryAbs) {
  if (!isFullSha(sourceSha)) {
    throw new Error("FAIL_CLOSED:source_sha_not_full");
  }
  if (!fs.existsSync(entryAbs)) {
    throw new Error("FAIL_CLOSED:api_artifact_missing:" + ENTRY);
  }
  const digest = fileSha256(entryAbs);
  const manifest = {
    schema: SCHEMA,
    artifact_kind: ARTIFACT_KIND,
    not_web_kind: WEB_KIND,
    source_sha: String(sourceSha).toLowerCase(),
    entry: ENTRY,
    artifact_digest: digest,
    digest_alg: "sha256",
    built_once: true,
    deploy_forbidden_here: true,
    render_config_mutation: 0,
    registry: "BLOCKED_EXTERNAL_ACTION",
    acceptance: apiArtifactAcceptedNeverEqualsWeb(),
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "api-release-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}

function parseArgs(argv) {
  const out = { sourceSha: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--source-sha") out.sourceSha = argv[i + 1] || "";
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!isFullSha(args.sourceSha)) {
    process.stderr.write(
      "usage: api-artifact-provenance.cjs --source-sha <40hex>\n",
    );
    process.exit(2);
  }
  const repoRoot = path.resolve(__dirname, "../..");
  const entryAbs = path.join(repoRoot, ENTRY);
  const outDir = path.dirname(entryAbs);
  const manifest = writeApiManifest(outDir, args.sourceSha, entryAbs);
  process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(
      "[api-artifact-provenance] " +
        (err && err.message ? err.message : String(err)) +
        "\n",
    );
    process.exit(1);
  }
}

module.exports = {
  SCHEMA,
  ARTIFACT_KIND,
  WEB_KIND,
  ENTRY,
  isFullSha,
  apiArtifactAcceptedNeverEqualsWeb,
  writeApiManifest,
  parseArgs,
};
