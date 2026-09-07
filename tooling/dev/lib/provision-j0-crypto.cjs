"use strict";
const crypto = require("node:crypto");
function randomPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function hashBackup(code) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

function generateBackupCodes() {
  const codes = [];
  while (codes.length < 8) {
    const raw = crypto.randomBytes(8).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (raw.length === 10) codes.push(raw);
  }
  return codes;
}

function wrapKey(raw) {
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

function encryptTotpSecret(secret, rawWrap) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", wrapKey(rawWrap), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function hashPassword(password) {
  const N = 131072;
  const r = 8;
  const p = 1;
  const keyLen = 64;
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      Buffer.from(password, "utf8"),
      salt,
      keyLen,
      { N, r, p, maxmem: 256 * 1024 * 1024 },
      (err, derived) => {
        if (err) reject(err);
        else {
          resolve(["scrypt", String(N), String(r), String(p), salt.toString("base64"), derived.toString("base64")].join("$"));
        }
      },
    );
  });
}

module.exports = {
  randomPassword,
  hashBackup,
  generateBackupCodes,
  encryptTotpSecret,
  generateTotpSecret,
  hashPassword,
};
