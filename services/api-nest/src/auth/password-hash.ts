/**
 * Password storage — Infra §51.9.1 classic signup · OWASP Password Storage
 * Cheat Sheet (2026) · NIST SP 800-63B §5.1.1.2.
 *
 * Algorithm choice (self-describing, versioned, documented so a future
 * session does not need to re-derive the reasoning):
 *
 *   1st choice per this task's own priority order: Argon2id (OWASP min
 *      19 MiB / t=2 / p=1). NOT used here: it requires adding a new
 *      native-binding dependency (`@node-rs/argon2` or `node-argon2`) whose
 *      prebuilt-binary install cannot be safely verified end-to-end (pnpm
 *      workspace lockfile regeneration + this exact Windows dev machine +
 *      the CI ubuntu-latest matrix) within this session's low-spec-PC
 *      constraint (`phase0-ram.mdc` — Celeron G6900 2C/8GB). Adding a
 *      native dependency without being able to prove the install/lockfile
 *      round-trips cleanly is a real risk this task's own rules ask to
 *      avoid, not a shortcut.
 *   2nd choice (USED): scrypt, N=2^17 (131072), r=8, p=1 — the OWASP
 *      Cheat Sheet's explicit alternative parameter set. Zero new
 *      dependency (Node.js `crypto.scrypt` is built in on every Node 22
 *      runtime this repo targets — this dev machine, GitHub Actions
 *      ubuntu-latest, and the Phase0 Node-process production host all get
 *      byte-identical behaviour with zero install risk). This is NOT an
 *      algorithm weakening — scrypt is independently OWASP/NIST-acceptable
 *      for password storage, it is simply this task's own documented
 *      fallback tier, chosen here for a disclosed, reasoned compatibility
 *      constraint rather than picked silently.
 *
 * The stored hash is self-describing (`scrypt$N$r$p$saltB64$hashB64`) so:
 *   - verification never has to guess parameters,
 *   - a future session can add "argon2id$..." as a second recognized
 *     prefix and upgrade users transparently on their next successful
 *     login (rehash-on-login), with zero data migration and zero forced
 *     re-registration.
 *
 * Hard rules enforced here:
 *   - plaintext password never logged, persisted, or sent to any
 *     analytics/telemetry path (this module only ever returns/consumes the
 *     encoded hash string).
 *   - verification is constant-time (`crypto.timingSafeEqual`).
 *   - concurrent hashing is bounded (`withHashConcurrencyLimit`) so a burst
 *     of signups cannot starve the Node event loop / exhaust CPU on the
 *     small Phase0 host.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

/** OWASP Password Storage Cheat Sheet (2026) scrypt parameter set. */
export const SCRYPT_PARAMS = Object.freeze({
  N: 131072, // 2^17
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 16,
});

/** scrypt's own hard requirement: maxmem must exceed 128*N*r*p bytes. */
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function scryptAsync(
  password: Buffer,
  salt: Buffer,
  keyLen: number,
  opts: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keyLen, opts, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

// ── bounded concurrency (Phase0 8GB host — never let N unbounded signup/
// login bursts each spawn a 128MiB-class scrypt call at the same time) ──
const MAX_CONCURRENT_HASH_OPS = 4;
let activeHashOps = 0;
const hashOpQueue: Array<() => void> = [];

function acquireHashSlot(): Promise<void> {
  if (activeHashOps < MAX_CONCURRENT_HASH_OPS) {
    activeHashOps += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    hashOpQueue.push(() => {
      activeHashOps += 1;
      resolve();
    });
  });
}

function releaseHashSlot(): void {
  activeHashOps -= 1;
  const next = hashOpQueue.shift();
  if (next) next();
}

async function withHashConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquireHashSlot();
  try {
    return await fn();
  } finally {
    releaseHashSlot();
  }
}

const ENCODED_PREFIX = "scrypt";

/** Hash a plaintext password into a self-describing, storable string. */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("password required");
  }
  return withHashConcurrencyLimit(async () => {
    const { N, r, p, keyLen, saltLen } = SCRYPT_PARAMS;
    const salt = randomBytes(saltLen);
    const derived = await scryptAsync(Buffer.from(password, "utf8"), salt, keyLen, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
    return [
      ENCODED_PREFIX,
      String(N),
      String(r),
      String(p),
      salt.toString("base64"),
      derived.toString("base64"),
    ].join("$");
  });
}

type ParsedScryptHash = {
  algo: "scrypt";
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function parseEncodedHash(encoded: string): ParsedScryptHash | null {
  if (typeof encoded !== "string") return null;
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== ENCODED_PREFIX) return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || N <= 0) return null;
  if (!Number.isInteger(r) || r <= 0) return null;
  if (!Number.isInteger(p) || p <= 0) return null;
  let salt: Buffer;
  let hash: Buffer;
  try {
    salt = Buffer.from(parts[4]!, "base64");
    hash = Buffer.from(parts[5]!, "base64");
  } catch {
    return null;
  }
  if (salt.length === 0 || hash.length === 0) return null;
  return { algo: "scrypt", N, r, p, salt, hash };
}

/**
 * Verify a plaintext password against a stored encoded hash.
 * Constant-time comparison; never throws on malformed input (returns false).
 */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  if (typeof password !== "string" || !password) return false;
  const parsed = parseEncodedHash(encoded);
  if (!parsed) return false;
  return withHashConcurrencyLimit(async () => {
    try {
      const derived = await scryptAsync(
        Buffer.from(password, "utf8"),
        parsed.salt,
        parsed.hash.length,
        { N: parsed.N, r: parsed.r, p: parsed.p, maxmem: SCRYPT_MAXMEM },
      );
      return (
        derived.length === parsed.hash.length &&
        timingSafeEqual(derived, parsed.hash)
      );
    } catch {
      return false;
    }
  });
}

/** True when `encoded` does not use today's preferred parameters — caller
 * may transparently rehash on next successful login (never forces a reset). */
export function needsRehash(encoded: string): boolean {
  const parsed = parseEncodedHash(encoded);
  if (!parsed) return true;
  return (
    parsed.N !== SCRYPT_PARAMS.N ||
    parsed.r !== SCRYPT_PARAMS.r ||
    parsed.p !== SCRYPT_PARAMS.p ||
    parsed.hash.length !== SCRYPT_PARAMS.keyLen
  );
}

/** Test/inspection seam — never used to bypass hashing in product code. */
export function isEncodedPasswordHash(value: unknown): boolean {
  return typeof value === "string" && parseEncodedHash(value) !== null;
}
