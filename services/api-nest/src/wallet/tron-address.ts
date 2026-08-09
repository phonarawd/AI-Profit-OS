/**
 * Tron (TRC20) address helpers — Node crypto only (no PG사 / no TronWeb SDK).
 * Day-1: deterministic unique address per derivation index from secret ref material.
 * Production HD (secp256k1 xprv m/44'/195'/0'/0/{i}) wires via hotWalletXpubRef secret.
 */

import { createHash, createHmac } from "node:crypto";

export const TRON_HD_PATH_PREFIX = "m/44'/195'/0'/0/";

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

/**
 * Derive a unique TRC20 deposit address for HD index.
 * Material = HMAC-SHA256(secretRef, path) → first 20 bytes as address payload.
 * Not a full BIP32 secp256k1 key — secret ref must map to Ops HD vault later.
 */
export function deriveTrc20Address(opts: {
  secretRef: string;
  derivationIndex: number;
}): { trc20Address: string; hdPath: string; qrPayload: string } {
  if (!opts.secretRef || opts.secretRef.length < 1) {
    throw new Error("hotWalletXpubRef required for TRC20 derivation");
  }
  if (!Number.isInteger(opts.derivationIndex) || opts.derivationIndex < 0) {
    throw new Error("derivationIndex must be integer ≥0");
  }
  const hdPath = `${TRON_HD_PATH_PREFIX}${opts.derivationIndex}`;
  const material = createHmac("sha256", opts.secretRef)
    .update(hdPath)
    .digest();
  const trc20Address = tronAddressFromPayload20(material.subarray(0, 20));
  return {
    trc20Address,
    hdPath,
    qrPayload: trc20Address,
  };
}

export function isTrc20AddressFormat(addr: string): boolean {
  return typeof addr === "string" && addr.length >= 34 && addr.startsWith("T");
}
