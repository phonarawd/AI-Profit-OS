/**
 * Tron (TRC20) address helpers.
 *
 * Money invariant:
 * a deposit address is only valid when Operations controls the corresponding
 * spendable private key. A secret reference identifier is not key material and
 * must never be hashed into a synthetic address.
 *
 * Until the approved BIP32/secp256k1 vault/HSM deriver is wired,
 * deposit-address derivation must fail closed.
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

/** Base58Check Tron address encoder for already-controlled 20-byte payloads. */
export function tronAddressFromPayload20(payload20: Buffer): string {
  if (payload20.length !== 20) {
    throw new Error("tron payload must be 20 bytes");
  }
  const withPrefix = Buffer.concat([Buffer.from([0x41]), payload20]);
  const checksum = sha256(sha256(withPrefix)).subarray(0, 4);
  return base58Encode(Buffer.concat([withPrefix, checksum]));
}

export class TronHdDerivationUnavailableError extends Error {
  readonly code = TRON_HD_DERIVATION_UNAVAILABLE;

  constructor() {
    super(TRON_HD_DERIVATION_UNAVAILABLE);
    this.name = "TronHdDerivationUnavailableError";
  }
}

/**
 * Production-facing allocation boundary.
 *
 * secretRef is validated only as a reference identifier. It is deliberately
 * not treated as an HMAC/private-key seed. Replace this implementation only
 * when an approved deriver proves the returned address belongs to the
 * configured m/44'/195'/0'/0/{index} wallet hierarchy.
 */
export function deriveTrc20Address(opts: {
  secretRef: string;
  derivationIndex: number;
}): { trc20Address: string; hdPath: string; qrPayload: string } {
  if (!opts.secretRef || opts.secretRef.trim().length < 1) {
    throw new Error("hotWalletXpubRef required for TRC20 derivation");
  }
  if (!Number.isInteger(opts.derivationIndex) || opts.derivationIndex < 0) {
    throw new Error("derivationIndex must be integer ≥0");
  }
  throw new TronHdDerivationUnavailableError();
}

export function isTrc20AddressFormat(addr: string): boolean {
  return typeof addr === "string" && addr.length >= 34 && addr.startsWith("T");
}
