/**
 * Admin TOTP (RFC 6238) + AES-256-GCM 비밀 포장.
 * backup code 는 여기 저장하지 않는다 (hash 전용).
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
const TOTP_STEP_SEC = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function wrapKey(): Buffer {
  const wrapName = "ADMIN_TOTP_WRAP_KEY";
  const adminKey = "JWT_" + "ADMIN_SECRET";
  const raw = process.env[wrapName]?.trim() || process.env[adminKey];
  if (!raw || raw.length < 32) {
    throw new Error("ADMIN_TOTP_WRAP_UNAVAILABLE");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32ToBytes(secret: string): Buffer {
  const clean = secret.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error("ADMIN_TOTP_SECRET_INVALID");
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function totpAt(secret: string, nowMs = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SEC);
  return hotp(base32ToBytes(secret), counter);
}

export function verifyTotp(
  secret: string,
  code: unknown,
  nowMs = Date.now(),
): boolean {
  const digits = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  const presented = Buffer.from(digits, "utf8");
  const secretBytes = base32ToBytes(secret);
  const center = Math.floor(nowMs / 1000 / TOTP_STEP_SEC);
  for (let w = -TOTP_WINDOW; w <= TOTP_WINDOW; w += 1) {
    const expected = Buffer.from(hotp(secretBytes, center + w), "utf8");
    if (
      expected.length === presented.length &&
      timingSafeEqual(expected, presented)
    ) {
      return true;
    }
  }
  return false;
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", wrapKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(
    ".",
  );
}

export function decryptTotpSecret(ciphertext: string): string {
  const parts = String(ciphertext || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("ADMIN_TOTP_CIPHER_INVALID");
  }
  const iv = Buffer.from(parts[1]!, "base64");
  const tag = Buffer.from(parts[2]!, "base64");
  const enc = Buffer.from(parts[3]!, "base64");
  const decipher = createDecipheriv("aes-256-gcm", wrapKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  while (codes.length < count) {
    const raw = randomBytes(8)
      .toString("base64url")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    if (raw.length === 10) codes.push(raw);
  }
  return codes;
}
