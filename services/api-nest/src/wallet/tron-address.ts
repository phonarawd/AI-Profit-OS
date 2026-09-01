/**
 * Tron (TRC20) address helpers — Node crypto only (no PG사 / no TronWeb SDK).
 *
 * Canonical HD path is locked: m/44'/195'/0'/0/{index}.
 * A spendable address may be produced only by an approved BIP32 secp256k1
 * deriver bound to real vault/HSM key material. This repo has no such deriver.
 *
 * Hashing a secret *reference string* is not derivation. That path is removed.
 */

import { createHash } from "node:crypto";

export const TRON_HD_PATH_PREFIX = "m/44'/195'/0'/0/";

export const TRON_HD_DERIVATION_UNAVAILABLE =
  "TRON_HD_DERIVATION_UNAVAILABLE" as const;

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

function base58Encode(buf: Buffer): string {
  let zeros = 0;
  while (zeros < buf.length && buf[zeros] === 0) zeros += 1;

  const digits = [0];
  for (let i = zeros; i < buf.length; i += 1) {
    let carry = buf[i];
    for (let j = 0; j < digits.length; j += 1) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out += BASE58[digits[i]];
  }
  return out;
}

/** Base58Check Tron address (0x41 + 20 bytes). */
export function tronAddressFromPayload20(payload20: Buffer): string {
  if (payload20.length !== 20) {
    throw new Error("tron payload must be 20 bytes");
  }
  const withPrefix = Buffer.concat([Buffer.from([0x41]), payload20]);
  const checksum = sha256(sha256(withPrefix)).subarray(0, 4);
  return base58Encode(Buffer.concat([withPrefix, checksum]));
}

export type CanonicalTrc20Derived = {
  trc20Address: string;
  hdPath: string;
  qrPayload: string;
};

export type CanonicalTrc20Deriver = {
  derive(opts: { derivationIndex: number }): CanonicalTrc20Derived;
};

export class TronHdDerivationUnavailableError extends Error {
  readonly code = TRON_HD_DERIVATION_UNAVAILABLE;
  readonly status = 503;

  constructor() {
    super(TRON_HD_DERIVATION_UNAVAILABLE);
    this.name = "TronHdDerivationUnavailableError";
  }
}

/**
 * Approved vault/HSM BIP32 resolver — none is bound in this repository.
 * Do not invent a provider or hash a secret-ref string.
 */
export function resolveCanonicalTrc20Deriver(): CanonicalTrc20Deriver | null {
  return null;
}

export function requireCanonicalTrc20Deriver(): CanonicalTrc20Deriver {
  const deriver = resolveCanonicalTrc20Deriver();
  if (!deriver) {
    throw new TronHdDerivationUnavailableError();
  }
  return deriver;
}

/**
 * Allocate a TRC20 address only after a real canonical deriver succeeds.
 * `secretRef` is a locator, never key material.
 */
export function deriveTrc20Address(opts: {
  secretRef: string;
  derivationIndex: number;
}): CanonicalTrc20Derived {
  if (!opts.secretRef || opts.secretRef.length < 1) {
    throw new Error("hotWalletXpubRef required for TRC20 derivation");
  }
  if (!Number.isInteger(opts.derivationIndex) || opts.derivationIndex < 0) {
    throw new Error("derivationIndex must be integer ≥0");
  }
  return allocateCanonicalTrc20Address({
    derivationIndex: opts.derivationIndex,
    persist: (derived) => derived,
  });
}

/**
 * persist() runs only after a real canonical deriver returns an address.
 * Missing vault/HSM binding must not INSERT or emit a QR.
 */
export function allocateCanonicalTrc20Address<T>(opts: {
  derivationIndex: number;
  persist: (derived: CanonicalTrc20Derived) => T;
}): T {
  if (!Number.isInteger(opts.derivationIndex) || opts.derivationIndex < 0) {
    throw new Error("derivationIndex must be integer ≥0");
  }
  const deriver = requireCanonicalTrc20Deriver();
  const derived = deriver.derive({ derivationIndex: opts.derivationIndex });
  if (!isTrc20AddressFormat(derived.trc20Address)) {
    throw new Error("derived address failed format check");
  }
  return opts.persist(derived);
}

export function isTrc20AddressFormat(addr: string): boolean {
  return typeof addr === "string" && addr.length >= 34 && addr.startsWith("T");
}
