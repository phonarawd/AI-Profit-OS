/**
 * 다중 공식 파일 atomic replace.
 * 검증 후 staging → dest replace. 실패 시 snapshot 전체 복원.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

function sha256Bytes(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function snapshotBytes(root, rels) {
  const out = new Map();
  for (const rel of rels) {
    const abs = path.join(root, rel);
    out.set(rel, fs.existsSync(abs) ? fs.readFileSync(abs) : null);
  }
  return out;
}

function restoreBytes(root, snap) {
  for (const [rel, buf] of snap.entries()) {
    const abs = path.join(root, rel);
    if (buf == null) {
      if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
    }
  }
}

function atomicReplace(root, writes, opts = {}) {
  const rels = Object.keys(writes);
  const snap = snapshotBytes(root, rels);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-atomic-pub-"));
  try {
    const staged = [];
    for (const rel of rels) {
      const tmp = path.join(tmpDir, rel.replace(/[\\/]/g, "__"));
      fs.writeFileSync(tmp, writes[rel]);
      staged.push({
        rel,
        tmp,
        dest: path.join(root, rel),
        sha256: sha256Bytes(writes[rel]),
      });
    }
    if (typeof opts.verifyStaged === "function") {
      opts.verifyStaged(staged);
    }
    if (opts.failBeforeReplace === true) {
      const err = new Error("injected failBeforeReplace — destination files must stay unchanged");
      err.code = "INJECTED_FAIL";
      throw err;
    }
    let i = 0;
    for (const item of staged) {
      if (
        opts.failDuringReplace === true &&
        i === (Number.isInteger(opts.failDuringReplaceAfter) ? opts.failDuringReplaceAfter : 0)
      ) {
        const destTmp = `${item.dest}.tmp-atomic`;
        fs.mkdirSync(path.dirname(item.dest), { recursive: true });
        fs.copyFileSync(item.tmp, destTmp);
        fs.rmSync(item.dest, { force: true });
        fs.renameSync(destTmp, item.dest);
        const err = new Error("injected failDuringReplace — restore all destinations");
        err.code = "INJECTED_FAIL";
        throw err;
      }
      const destTmp = `${item.dest}.tmp-atomic`;
      fs.mkdirSync(path.dirname(item.dest), { recursive: true });
      fs.copyFileSync(item.tmp, destTmp);
      try {
        fs.rmSync(item.dest, { force: true });
        fs.renameSync(destTmp, item.dest);
      } catch (e) {
        if (fs.existsSync(destTmp)) fs.rmSync(destTmp, { force: true });
        throw e;
      }
      i += 1;
    }
  } catch (e) {
    restoreBytes(root, snap);
    throw e;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = {
  sha256Bytes,
  snapshotBytes,
  restoreBytes,
  atomicReplace,
};
