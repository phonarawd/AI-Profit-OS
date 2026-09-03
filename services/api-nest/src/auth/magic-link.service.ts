/**
 * Magic link — raw email 만으로는 세션을 만들지 않는다.
 * 일회용 hash·만료·원자적 consume.
 */

import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ResendEmailProvider } from "../wallet/resend-email.provider";
import {
  MAGIC_LINK_TTL_MS,
  consumerOrigin,
  hashProofSecret,
  isValidEmail,
  randomProofSecret,
} from "./identity-proof.crypto";
import type { ProofChallengeStore } from "./identity-proof.store";

export type MagicLinkRequestResult = {
  ok: true;
  delivery: "resend";
  status: "accepted";
};

export type ProvenMagicEmail = {
  email: string;
};

export class MagicLinkService {
  constructor(
    private readonly store: ProofChallengeStore,
    private readonly resend: ResendEmailProvider,
    private readonly nowMs: () => number = Date.now,
  ) {}

  async request(body: Record<string, unknown>): Promise<MagicLinkRequestResult> {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !isValidEmail(email)) {
      throw new BadRequestException("valid email required");
    }
    const token = randomProofSecret();
    const hash = hashProofSecret(token);
    const now = this.nowMs();
    await this.store.put({
      kind: "magic_link",
      hash,
      expiresAtMs: now + MAGIC_LINK_TTL_MS,
      consumedAtMs: null,
      payload: { email },
    });
    const url = `${consumerOrigin()}/auth/magic?token=${token}`;
    const sent = await this.resend.sendMagicLink({ to: email, url });
    if (!sent.ok) {
      // 전송 실패를 성공처럼 표시하지 않는다. raw token/provider reason 은 응답에 노출하지 않음.
      throw new ServiceUnavailableException("MAGIC_LINK_DELIVERY_UNAVAILABLE");
    }
    return { ok: true, delivery: "resend", status: "accepted" };
  }

  async peekEmail(token: string): Promise<string | null> {
    if (!token || token.length < 16 || token.length > 256) return null;
    const fresh = await this.store.findFresh(
      "magic_link",
      hashProofSecret(token),
      this.nowMs(),
    );
    const email = String(fresh?.payload.email ?? "");
    return email && isValidEmail(email) ? email : null;
  }

  /**
   * token 이 없으면 실패. email-only 는 여기서 즉시 거부.
   * 신규 유저 + 약관 없음 → TERMS_REQUIRED (consume 하지 않음).
   */
  async prove(body: Record<string, unknown>, opts: { userExists: boolean }): Promise<ProvenMagicEmail> {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      throw new BadRequestException("magic link token required");
    }
    if (token.length < 16 || token.length > 256) {
      throw new BadRequestException("malformed magic link token");
    }
    const hash = hashProofSecret(token);
    const now = this.nowMs();
    const fresh = await this.store.findFresh("magic_link", hash, now);
    if (!fresh) {
      throw new BadRequestException("magic link invalid");
    }
    const email = String(fresh.payload.email ?? "");
    if (!email || !isValidEmail(email)) {
      throw new BadRequestException("magic link invalid");
    }
    if (!opts.userExists) {
      const terms =
        typeof body.termsAcceptedAt === "string" && body.termsAcceptedAt.trim();
      const privacy =
        typeof body.privacyAcceptedAt === "string" && body.privacyAcceptedAt.trim();
      if (!terms || !privacy) {
        throw new BadRequestException("TERMS_REQUIRED");
      }
    }
    const consumed = await this.store.consumeAtomic("magic_link", hash, now);
    if (!consumed) {
      throw new BadRequestException("magic link invalid");
    }
    return { email };
  }
}

export function assertMagicLinkServiceReady(
  store: ProofChallengeStore | null,
  resend: ResendEmailProvider | null,
): void {
  if (!store || !resend) {
    throw new ServiceUnavailableException("magic-link proof path unavailable");
  }
}
