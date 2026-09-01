/**
 * WebAuthn — browser credentialId 단독 신뢰 금지.
 * 서버 challenge · 만료 · 일회용 · RP/origin · 서명 · signCount.
 */

import { BadRequestException } from "@nestjs/common";
import { createPublicKey } from "node:crypto";
import {
  WEBAUTHN_CHALLENGE_TTL_MS,
  exportSpkiDer,
  hashProofSecret,
  hasWebauthnUserPresence,
  parseAuthenticatorData,
  parseClientDataJSON,
  randomProofSecret,
  verifyEs256P1363,
  verifyRpIdHash,
  webauthnSignedBytes,
} from "./identity-proof.crypto";
import type { ProofChallengeStore } from "./identity-proof.store";
import { loadAuthWebauthnRp, type AuthWebauthnRp } from "./webauthn-rp";

export type WebauthnKind = "register" | "authenticate";

export type WebauthnOptionsView = {
  ok: true;
  kind: WebauthnKind;
  status: "ready";
  rpName: "퍼뜩";
  rpId: string;
  origin: string;
  challenge: string;
  issuer: "ai-profit-os-nest";
};

export type StoredPasskey = {
  credentialId: string;
  publicKeySpki: Buffer;
  signCount: number;
};

export type ProvenPasskey = {
  kind: WebauthnKind;
  credentialId: string;
  publicKeySpki: Buffer;
  signCount: number;
};

export type PasskeyLookup = {
  findByCredentialId(credentialId: string): Promise<StoredPasskey | null>;
};

export class WebauthnAssertService {
  constructor(
    private readonly store: ProofChallengeStore,
    private readonly nowMs: () => number = Date.now,
    private readonly rp: AuthWebauthnRp = loadAuthWebauthnRp(),
  ) {}

  async options(kind: WebauthnKind): Promise<WebauthnOptionsView> {
    const challenge = randomProofSecret();
    await this.store.put({
      kind: "webauthn",
      hash: hashProofSecret(challenge),
      expiresAtMs: this.nowMs() + WEBAUTHN_CHALLENGE_TTL_MS,
      consumedAtMs: null,
      payload: { webauthnKind: kind },
    });
    return {
      ok: true,
      kind,
      status: "ready",
      rpName: this.rp.rpName,
      rpId: this.rp.rpId,
      origin: this.rp.origin,
      challenge,
      issuer: "ai-profit-os-nest",
    };
  }

  async prove(
    kind: WebauthnKind,
    body: Record<string, unknown>,
    lookup: PasskeyLookup,
  ): Promise<ProvenPasskey> {
    const credentialId =
      typeof body.credentialId === "string"
        ? body.credentialId.trim()
        : typeof body.id === "string"
          ? body.id.trim()
          : "";
    const clientDataJSON =
      typeof body.clientDataJSON === "string" ? body.clientDataJSON : "";
    const authenticatorData =
      typeof body.authenticatorData === "string" ? body.authenticatorData : "";
    const signatureB64 =
      typeof body.signature === "string" ? body.signature : "";
    if (!credentialId || !clientDataJSON || !authenticatorData || !signatureB64) {
      throw new BadRequestException("webauthn assertion required");
    }

    let clientData;
    let authData;
    try {
      clientData = parseClientDataJSON(clientDataJSON);
      authData = parseAuthenticatorData(authenticatorData);
    } catch {
      throw new BadRequestException("malformed webauthn payload");
    }

    const expectedType = kind === "register" ? "webauthn.create" : "webauthn.get";
    if (clientData.type !== expectedType) {
      throw new BadRequestException("webauthn type mismatch");
    }
    if (clientData.origin !== this.rp.origin) {
      throw new BadRequestException("webauthn origin mismatch");
    }
    if (clientData.crossOrigin) {
      throw new BadRequestException("webauthn cross-origin ceremony forbidden");
    }
    if (!verifyRpIdHash(authData, this.rp.rpId)) {
      throw new BadRequestException("webauthn rpId mismatch");
    }
    if (!hasWebauthnUserPresence(authData)) {
      throw new BadRequestException("webauthn user presence required");
    }

    const consumed = await this.store.consumeAtomic(
      "webauthn",
      hashProofSecret(clientData.challenge),
      this.nowMs(),
    );
    if (!consumed || consumed.payload.webauthnKind !== kind) {
      throw new BadRequestException("webauthn challenge invalid");
    }

    const signed = webauthnSignedBytes(authData.raw, clientDataJSON);
    const signature = Buffer.from(signatureB64, "base64url");

    if (kind === "authenticate") {
      const stored = await lookup.findByCredentialId(credentialId);
      if (!stored) throw new BadRequestException("webauthn credential unknown");
      const ok = verifyEs256P1363(stored.publicKeySpki, signed, signature);
      if (!ok) throw new BadRequestException("webauthn signature invalid");
      if (authData.signCount > 0 && authData.signCount <= stored.signCount) {
        throw new BadRequestException("webauthn signCount replay");
      }
      return {
        kind,
        credentialId,
        publicKeySpki: stored.publicKeySpki,
        signCount: authData.signCount,
      };
    }

    const publicKeyB64 =
      typeof body.publicKey === "string" ? body.publicKey.trim() : "";
    if (!publicKeyB64) {
      throw new BadRequestException("webauthn publicKey required for register");
    }
    let publicKeySpki: Buffer;
    try {
      publicKeySpki = Buffer.from(publicKeyB64, "base64url");
      createPublicKey({ key: publicKeySpki, format: "der", type: "spki" });
    } catch {
      throw new BadRequestException("webauthn publicKey invalid");
    }
    const ok = verifyEs256P1363(publicKeySpki, signed, signature);
    if (!ok) throw new BadRequestException("webauthn signature invalid");
    return {
      kind,
      credentialId,
      publicKeySpki,
      signCount: authData.signCount,
    };
  }
}

export function spkiToB64url(key: Buffer): string {
  return key.toString("base64url");
}

export { exportSpkiDer };
