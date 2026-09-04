"use strict";

/**
 * 출시 산출물을 한 번만 포장하고 SHA-256 digest를 고정한다.
 * OpenNext 빌드는 CI workflow가 선행한다. 이 스크립트는 재빌드하지 않는다.
 */
const path = require("path");
const { packFromRepo, packFromPayload } = require("./artifact-provenance.cjs");

function parseArgs(argv) {
  const out = { sourceSha: "", out: "", fromRepo: false, fromPayload: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--source-sha") out.sourceSha = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
    if (argv[i] === "--from-repo") out.fromRepo = true;
    if (argv[i] === "--from-payload") out.fromPayload = argv[i + 1] || "";
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.sourceSha || !args.out || (!args.fromRepo && !args.fromPayload)) {
    process.stderr.write(
      "usage: build-once-artifact.cjs --source-sha <40hex> --out <dir> (--from-repo | --from-payload <dir>)\n",
    );
    process.exit(2);
  }
  const outDir = path.resolve(args.out);
  try {
    const manifest = args.fromRepo
      ? packFromRepo(path.resolve(__dirname, "../.."), outDir, args.sourceSha)
      : packFromPayload(path.resolve(args.fromPayload), outDir, args.sourceSha);
    process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
  } catch (err) {
    const fails = err && err.fails ? err.fails : ["FAIL_CLOSED:" + (err && err.message ? err.message : err)];
    process.stderr.write("[build-once-artifact] FAIL_CLOSED\n- " + fails.join("\n- ") + "\n");
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { parseArgs };
