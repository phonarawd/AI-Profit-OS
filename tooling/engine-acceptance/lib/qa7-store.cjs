/**
 * QA7 raw trace storage — OS temp only · LOCAL_VALIDATION_ONLY · never git-tracked
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/**
 * @param {string} runId
 */
function createQa7TraceDir(runId) {
  const base = path.join(os.tmpdir(), "aipo-qa7-traces");
  fs.mkdirSync(base, { recursive: true });
  const dir = path.join(base, String(runId).replace(/[^\w.-]+/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * @param {string} dir
 * @param {string} caseId
 * @param {object} artifact
 */
function writeTraceArtifact(dir, caseId, artifact) {
  const safe = String(caseId).replace(/[^\w.-]+/g, "_");
  const file = path.join(dir, `${safe}.trace.json`);
  fs.writeFileSync(file, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return file;
}

/**
 * @param {string} dir
 * @param {object} summary
 */
function writeRunSummary(dir, summary) {
  const file = path.join(dir, "qa7-local-summary.json");
  fs.writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return file;
}

/**
 * @param {string} dir
 */
function listTraceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".trace.json"))
    .map((f) => path.join(dir, f));
}

/**
 * @param {string} file
 */
function readTraceArtifact(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = {
  createQa7TraceDir,
  writeTraceArtifact,
  writeRunSummary,
  listTraceFiles,
  readTraceArtifact,
};
