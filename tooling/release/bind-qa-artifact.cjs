"use strict";

/**
 * QA가 검증한 출시 산출물 digest를 기록한다.
 * 재계산 digest ≠ manifest/요청 SHA 이면 FAIL_CLOSED.
 */
const fs = require("fs");
const path = require("path");
const { qaRecord, verifyBundle } = require("./artifact-provenance.cjs");

function parseArgs(argv) {
  const out = { sha: "", bundle: "", out: "", optional: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--bundle") out.bundle = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
    if (argv[i] === "--optional") out.optional = true;
  }
  return out;
}

function writeOut(filePath, record) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2) + "\n");
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.sha || !args.bundle || !args.out) {
    process.stderr.write(
      "usage: bind-qa-artifact.cjs --sha <40hex> --bundle <dir> --out <file> [--optional]\n",
    );
    process.exit(2);
  }
  const bundleDir = path.resolve(args.bundle);
  if (!fs.existsSync(bundleDir)) {
    const record = qaRecord(false, { source_sha: args.sha, reason: "artifact_missing" });
    writeOut(args.out, record);
    if (args.optional) return;
    process.stderr.write("[bind-qa-artifact] FAIL_CLOSED\n- FAIL_CLOSED:artifact_missing\n");
    process.exit(1);
  }
  try {
    const bound = verifyBundle(bundleDir, { sourceSha: args.sha });
    const record = qaRecord(true, {
      source_sha: bound.source_sha,
      artifact_digest: bound.digest,
      built_once: true,
    });
    writeOut(args.out, record);
    process.stdout.write(JSON.stringify(record, null, 2) + "\n");
  } catch (err) {
    const fails = err && err.fails ? err.fails : ["FAIL_CLOSED:" + (err && err.message ? err.message : err)];
    const record = qaRecord(false, { source_sha: args.sha, reason: fails[0], fails });
    writeOut(args.out, record);
    if (args.optional) return;
    process.stderr.write("[bind-qa-artifact] FAIL_CLOSED\n- " + fails.join("\n- ") + "\n");
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { parseArgs };
