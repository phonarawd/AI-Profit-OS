/**
 * verify:schemas-contract — schemas/*.json 서버 계약 정적 검증 (CI job `api-contract` · T2).
 *  - 모든 파일이 JSON 으로 파싱 (BOM 허용 0)
 *  - JSON Schema 파일: $schema = draft 2020-12 · $id 가 파일명으로 끝나고 전체에서 유일 · title/description 존재 ·
 *    type=object 면 properties 존재 · required 의 모든 키가 properties 에 있음 · additionalProperties 명시 ·
 *    $ref 는 같은 파일 #/$defs 또는 schemas/ 안의 존재하는 파일만
 *  - manifest.day1.json 의 files 목록은 전부 존재하고 · 목록에 없는 스키마는 보고(경고)
 *  - instance 파일(operator-entity.instance.json · market-partner.registry.json)은 대응 스키마의 required 키를 가진다
 * ajv 등 검증 라이브러리는 레포 의존성에 없어 구조 규칙만 검사한다 (quality/backend-ci.md 참조).
 */
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:schemas-contract]";
const fails = [];
const warns = [];
const D = String.fromCharCode(36); // "$"

const files = execFileSync("git", ["ls-files", "-z", "--", "schemas/*.json"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .map((p) => p.replace(/\\/g, "/"))
  .sort();
if (!files.length) {
  console.error(tag + " FAIL no schemas/*.json tracked");
  process.exit(1);
}

const parsed = new Map();
for (const f of files) {
  const raw = fs.readFileSync(path.join(root, f), "utf8");
  if (raw.charCodeAt(0) === 0xfeff) fails.push(f + ": UTF-8 BOM");
  try {
    parsed.set(f, JSON.parse(raw.replace(/^\uFEFF/, "")));
  } catch (e) {
    fails.push(f + ": invalid JSON: " + e.message);
  }
}

const ids = new Map();
const schemaFiles = [];
const instanceFiles = [];
// $id 인덱스를 먼저 만든다 ($ref 가 파일 순서보다 뒤의 스키마를 가리킬 수 있다)
for (const [f, j] of parsed) {
  if (typeof j[D + "schema"] === "string" && typeof j[D + "id"] === "string" && !ids.has(j[D + "id"])) ids.set(j[D + "id"], f);
}
const idOwners = new Map(ids);
function collectRefs(node, out) {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === D + "ref" && typeof v === "string") out.push(v);
      else collectRefs(v, out);
    }
  }
  return out;
}
for (const [f, j] of parsed) {
  const isSchema = typeof j[D + "schema"] === "string";
  if (!isSchema) {
    instanceFiles.push(f);
    continue;
  }
  schemaFiles.push(f);
  const base = path.posix.basename(f);
  if (!/json-schema\.org\/draft\/2020-12\/schema$/.test(j[D + "schema"])) fails.push(f + ": " + D + "schema must be draft 2020-12");
  const id = String(j[D + "id"] || "");
  if (!id) fails.push(f + ": " + D + "id missing");
  else {
    if (!id.endsWith("/" + base)) fails.push(f + ": " + D + "id must end with the file name (" + id + ")");
    if (idOwners.get(id) !== f) fails.push(f + ": " + D + "id duplicates " + idOwners.get(id));
  }
  if (!j.title) fails.push(f + ": title missing");
  if (!j.description) fails.push(f + ": description missing");
  if (j.type === "object") {
    if (!j.properties || typeof j.properties !== "object") fails.push(f + ": type=object without properties");
    if (j.additionalProperties === undefined) fails.push(f + ": additionalProperties must be explicit");
    for (const r of j.required || []) {
      if (!j.properties || !(r in j.properties)) fails.push(f + ": required key " + r + " is not in properties");
    }
  }
  for (const ref of collectRefs(j, [])) {
    if (ref.startsWith("#/")) {
      const segs = ref.slice(2).split("/");
      let cur = j;
      for (const s of segs) cur = cur && typeof cur === "object" ? cur[s.replace(/~1/g, "/").replace(/~0/g, "~")] : undefined;
      if (cur === undefined) fails.push(f + ": local " + D + "ref does not resolve: " + ref);
    } else {
      const target = ref.split("#")[0].replace(/^\.\//, "");
      if (!files.includes("schemas/" + target) && !ids.has(target)) fails.push(f + ": " + D + "ref to a missing schema: " + ref);
    }
  }
}

const manifest = parsed.get("schemas/manifest.day1.json");
if (!manifest) fails.push("schemas/manifest.day1.json missing");
else {
  const listed = new Set(manifest.files || []);
  for (const name of listed) if (!files.includes("schemas/" + name)) fails.push("manifest.day1.json lists a missing schema: " + name);
  for (const f of schemaFiles) {
    const base = path.posix.basename(f);
    if (base !== "manifest.day1.json" && !listed.has(base)) warns.push("schema not listed in manifest.day1.json (day-1 inventory is a subset): " + base);
  }
}

for (const f of instanceFiles) {
  const base = path.posix.basename(f);
  const candidate = base.replace(/\.(instance|registry)\.json$/, ".v1.json");
  const schema = parsed.get("schemas/" + candidate);
  if (!schema) {
    warns.push(f + ": no sibling schema " + candidate + " to check required keys against");
    continue;
  }
  const inst = parsed.get(f);
  for (const r of schema.required || []) {
    if (!(inst && typeof inst === "object" && r in inst)) fails.push(f + ": instance lacks required key " + r + " from " + candidate);
  }
}

for (const w of warns) console.warn(tag + " WARN " + w);
if (fails.length) {
  console.error(tag + " FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(tag + " PASS (" + schemaFiles.length + " schemas · " + instanceFiles.length + " instances · draft 2020-12 · unique " + D + "id · required in properties · refs resolve)");
