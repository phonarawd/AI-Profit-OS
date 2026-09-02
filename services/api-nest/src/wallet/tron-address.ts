/**
 * Tron (TRC20) address helpers — no PG사 / no TronWeb SDK.
 *
 * Canonical HD path: m/44'/195'/0'/0/{index}.
 * Authority = BIP32 public derivation from TRON_HOT_WALLET_XPUB (KMS xpub).
 * Private keys / mnemonics never enter Nest. Synthetic HMAC(secretRef) removed.
 */

import { createHash } from "node:crypto";
import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

export const TRON_HD_PATH_PREFIX = "m/44'/195'/0'/0/";
export const TRON_HD_DERIVATION_UNAVAILABLE =
  "TRON_HD_DERIVATION_UNAVAILABLE" as const;

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const XPUB_RE = /^(xpub|tpub)[1-9A-HJ-NP-Za-km-z]{79,120}$/;

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
  for (let i = digits.length - 1; i >= 0; i -= 1) out += BASE58[digits[i]];
  return out;
}

export function tronAddressFromPayload20(payload20: Buffer): string {
  if (payload20.length !== 20) throw new Error("tron payload must be 20 bytes");
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

export function isTronHotWalletXpub(value: string): boolean {
  return XPUB_RE.test(value.trim());
}

export function createXpubTrc20Deriver(xpub: string): CanonicalTrc20Deriver {
  const trimmed = xpub.trim();
  if (!isTronHotWalletXpub(trimmed)) throw new Error("TRON_HOT_WALLET_XPUB_INVALID");
  const root = HDKey.fromExtendedKey(trimmed);
  const depth = root.depth;
  if (depth !== 3 && depth !== 4) throw new Error("TRON_HOT_WALLET_XPUB_DEPTH");
  return {
    derive(opts: { derivationIndex: number }): CanonicalTrc20Derived {
      if (!Number.isInteger(opts.derivationIndex) || opts.derivationIndex < 0) {
        throw new Error("derivationIndex must be integer ≥0");
      }
      const leaf =
        depth === 3
          ? root.deriveChild(0).deriveChild(opts.derivationIndex)
          : root.deriveChild(opts.derivationIndex);
      const compressed = leaf.publicKey;
      if (!compressed || compressed.length !== 33) {
        throw new Error("TRON_HD_PUBLIC_KEY_MISSING");
      }
      const point = secp256k1.ProjectivePoint.fromHex(compressed);
      const uncompressed = point.toRawBytes(false);
      const hash = keccak_256(uncompressed.subarray(1));
      const payload20 = Buffer.from(hash.subarray(12));
      const trc20Address = tronAddressFromPayload20(payload20);
      return {
        trc20Address,
        hdPath: `${TRON_HD_PATH_PREFIX}${opts.derivationIndex}`,
        qrPayload: trc20Address,
      };
    },
  };
}

export function resolveXpubTrc20DeriverFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CanonicalTrc20Deriver | null {
  const raw = (env.TRON_HOT_WALLET_XPUB ?? "").trim();
  if (!raw) return null;
  try {
    return createXpubTrc20Deriver(raw);
  } catch {
    return null;
  }
}

/** Approved BIP32 resolver — env xpub only. Missing ⇒ null (fail-closed). */
export function resolveCanonicalTrc20Deriver(
  env: NodeJS.ProcessEnv = process.env,
): CanonicalTrc20Deriver | null {
  return resolveXpubTrc20DeriverFromEnv(env);
}

export function requireCanonicalTrc20Deriver(
  env: NodeJS.ProcessEnv = process.env,
): CanonicalTrc20Deriver {
  const deriver = resolveCanonicalTrc20Deriver(env);
  if (!deriver) throw new TronHdDerivationUnavailableError();
  return deriver;
}

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
