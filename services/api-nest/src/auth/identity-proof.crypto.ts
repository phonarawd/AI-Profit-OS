/**
 * Auth identity-proof primitives — hash · origin · WebAuthn ES256.
 * 호출자 주장 subject/email/credentialId 를 권위로 쓰지 않는다.
 */

import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as signSync,
  verify as verifySync,
  type KeyObject,
} from "node:crypto";
import { loadPhase0Env } from "../config/phase0.env";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function sha256(data: Buffer | string): Buffer {
  return createHash("sha256").update(data).digest();
}

export function hashProofSecret(raw: string): string {
  return sha256(raw).toString("hex");
}

export function randomProofSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hostOrigin(host: string): string {
  const trimmed = host.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (
    trimmed.startsWith("localhost") ||
    trimmed.startsWith("127.0.0.1") ||
    trimmed.startsWith("[::1]")
  ) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function consumerOrigin(nowEnv = loadPhase0Env()): string {
  return hostOrigin(nowEnv.appHost);
}

export function apiOrigin(nowEnv = loadPhase0Env()): string {
  return hostOrigin(nowEnv.apiHost);
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

export type ClientDataJSON = {
  type: string;
  challenge: string;
  origin: string;
};

export function parseClientDataJSON(b64url: string): ClientDataJSON {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(b64url, "base64url").toString("utf8"));
  } catch {
    throw new Error("malformed_client_data");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("malformed_client_data");
  }
  const o = parsed as Record<string, unknown>;
  if (
    typeof o.type !== "string" ||
    typeof o.challenge !== "string" ||
    typeof o.origin !== "string"
  ) {
    throw new Error("malformed_client_data");
  }
  return { type: o.type, challenge: o.challenge, origin: o.origin };
}

export type AuthenticatorData = {
  rpIdHash: Buffer;
  flags: number;
  signCount: number;
  raw: Buffer;
};

export function parseAuthenticatorData(b64url: string): AuthenticatorData {
  const raw = Buffer.from(b64url, "base64url");
  if (raw.length < 37) throw new Error("malformed_authenticator_data");
  return {
    rpIdHash: raw.subarray(0, 32),
    flags: raw[32] ?? 0,
    signCount: raw.readUInt32BE(33),
    raw,
  };
}

export function verifyRpIdHash(authData: AuthenticatorData, rpId: string): boolean {
  return authData.rpIdHash.equals(sha256(rpId));
}

export function verifyEs256P1363(
  publicKey: KeyObject | Buffer,
  signed: Buffer,
  signature: Buffer,
): boolean {
  try {
    const key =
      Buffer.isBuffer(publicKey)
        ? createPublicKey({ key: publicKey, format: "der", type: "spki" })
        : publicKey;
    return verifySync("SHA256", signed, { key, dsaEncoding: "ieee-p1363" }, signature);
  } catch {
    return false;
  }
}

export function webauthnSignedBytes(
  authenticatorData: Buffer,
  clientDataJSONB64url: string,
): Buffer {
  const clientHash = sha256(Buffer.from(clientDataJSONB64url, "base64url"));
  return Buffer.concat([authenticatorData, clientHash]);
}

/** 테스트용 ES256 키 · 실제 인증기 대체 */
export function generateTestEs256() {
  return generateKeyPairSync("ec", { namedCurve: "P-256" });
}

export function signEs256P1363(privateKey: KeyObject, data: Buffer): Buffer {
  return signSync("SHA256", data, { key: privateKey, dsaEncoding: "ieee-p1363" });
}

export function exportSpkiDer(publicKey: KeyObject): Buffer {
  return publicKey.export({ type: "spki", format: "der" }) as Buffer;
}
