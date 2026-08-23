/**
 * REL-403 release id. 비밀 아님.
 * 형식 = {semver}+{gitSha7|local}
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SPEC_REL = "governance/release-master/versioning.v1.json";
const root = path.resolve(__dirname, "../..");

function loadSpec() {
  return JSON.parse(fs.readFileSync(path.join(root, SPEC_REL), "utf8"));
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
    .version;
}

function gitShortSha() {
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .slice(0, 7);
  } catch {
    return "";
  }
}

function gitTagName(version) {
  const spec = loadSpec();
  return spec.tagPrefix + (version || readPackageVersion());
}

function resolveReleaseId(opts) {
  const override = process.env.PUTDUK_RELEASE_ID;
  if (override && String(override).trim()) return String(override).trim();
  const spec = loadSpec();
  const version = readPackageVersion();
  const sha = opts && opts.sha ? String(opts.sha) : gitShortSha();
  const suffix = /^[0-9a-f]{7}$/i.test(sha) ? sha : spec.localSuffix;
  return version + "+" + suffix;
}

module.exports = {
  SPEC_REL,
  loadSpec,
  readPackageVersion,
  gitShortSha,
  gitTagName,
  resolveReleaseId,
};

if (require.main === module) {
  process.stdout.write(resolveReleaseId() + "\n");
}
