/**
 * REL-018 표준 에셋 파이프라인 엔트리.
 * 단계: source → optimize → hash → public/ → review checklist
 * 기본은 dry-run. --apply 일 때만 dest에 쓴다. Home 잠금 경로는 쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const policy = require("./lib/policy.cjs");

const repoRoot = path.resolve(here, "../../../..");

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function parseArgs(argv) {
  const out = { request: "", apply: false, inventory: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--inventory") out.inventory = true;
    else if (a === "--request") out.request = argv[++i] || "";
    else if (a.startsWith("--request=")) out.request = a.slice("--request=".length);
  }
  return out;
}

function loadJson(abs) {
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function optimize(buf, destRel) {
  const ext = path.extname(destRel).toLowerCase();
  if (ext === ".svg") {
    const text = buf.toString("utf8").replace(/<!--[\s\S]*?-->/g, "").trim();
    return Buffer.from(text, "utf8");
  }
  return buf;
}

function checklist(result) {
  return {
    sourceRecorded: Boolean(result.sourceKind && result.sourceHash),
    optimizeRan: result.optimizeRan === true,
    hashRecorded: Boolean(result.destHash),
    destNotHomeLocked: result.homeLocked !== true,
    partnerOfficialOnly:
      result.class !== "partner_logo" || result.sourceKind === "official",
    aiPathZero: result.aiMarker === "",
    emojiIconZero: result.emojiFail !== true,
    wrotePublic: result.wrote === true,
  };
}

function fail(msg) {
  console.error(`[asset-pipeline] FAIL ${msg}`);
  process.exit(1);
}

const args = parseArgs(process.argv);

if (args.inventory) {
  const inv = loadJson(path.join(here, "inventory.v1.json"));
  console.log(JSON.stringify(inv, null, 2));
  process.exit(0);
}

if (!args.request) {
  fail("usage: node run.mjs --request <file.json> [--apply]");
}

const reqPath = path.isAbsolute(args.request)
  ? args.request
  : path.join(process.cwd(), args.request);
if (!fs.existsSync(reqPath)) fail(`request missing: ${reqPath}`);

const req = loadJson(reqPath);
const policyFails = policy.validateRequest(req);
if (policyFails.length) {
  for (const f of policyFails) console.error(`[asset-pipeline] ${f}`);
  process.exit(1);
}

const destRel = policy.normalizeRel(req.destRel);
const srcAbs = policy.resolveSourcePath(req, repoRoot);
if (!srcAbs || !fs.existsSync(srcAbs)) {
  fail(`source.path missing on disk: ${req.source && req.source.path}`);
}

const sourceBuf = fs.readFileSync(srcAbs);
const sourceHash = sha256(sourceBuf);
const optimized = optimize(sourceBuf, destRel);
const destHash = sha256(optimized);
const destAbs = path.join(repoRoot, destRel);

const result = {
  id: req.id,
  class: req.class,
  sourceKind: req.source.kind,
  sourcePath: policy.normalizeRel(req.source.path),
  destRel,
  sourceHash,
  destHash,
  sourceBytes: sourceBuf.length,
  destBytes: optimized.length,
  optimizeRan: true,
  aiMarker: policy.findAiMarker(req),
  homeLocked: policy.isHomeLockedPath(destRel),
  emojiFail: false,
  wrote: false,
  apply: args.apply === true,
};

if (result.homeLocked) fail(`Home locked dest refused: ${destRel}`);

if (args.apply) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, optimized);
  result.wrote = true;
}

result.review = checklist(result);
console.log(JSON.stringify(result, null, 2));
