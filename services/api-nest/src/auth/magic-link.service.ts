/**
 * Magic link - raw email alone never mints a session. One-time hash,
 * expiry, atomic consume.
 *
 * S1F Section 6.2 fixes (both were real, reproduced-before-fix bugs):
 *
 * 1. Consent (terms/privacy/marketing/referral) is now captured and
 *    persisted server-side at REQUEST time (identity-proof.store.ts writes
 *    it straight into auth_magic_link_challenges), and read back from the
 *    stored proof record at prove() time - never from the verify request's
 *    own body. Previously the caller (SignupRuntime.tsx) only kept consent
 *    in browser sessionStorage, which is empty when the link is opened on
 *    a different device/tab/browser, causing TERMS_REQUIRED for a
 *    perfectly legitimate signup.
 * 2. request() no longer returns {ok:true,status:"accepted"} when the
 *    underlying Resend send genuinely failed (as opposed to the explicit
 *    accepted_dev dev-only bypass) - it now throws a ServiceUnavailable so
 *    the caller can show an honest "can't send right now, try again"
 *    message, without ever revealing whether the target email has an
 *    account (the message is identical either way - it is about transport
 *    failure, not account existence).
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

export type MagicLinkRequestInput = {
  email: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsent?: boolean;
  referralCode?: string;
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
    const termsAcceptedAt =
      typeof body.termsAcceptedAt === "string" && body.termsAcceptedAt.trim()
        ? body.termsAcceptedAt.trim()
        : undefined;
    const privacyAcceptedAt =
      typeof body.privacyAcceptedAt === "string" && body.privacyAcceptedAt.trim()
        ? body.privacyAcceptedAt.trim()
        : undefined;
    const marketingConsent = body.marketingConsent === true;
    const referralCode =
      typeof body.referralCode === "string" && body.referralCode.trim()
        ? body.referralCode.trim()
        : undefined;
    await this.store.put({
      kind: "magic_link",
      hash,
      expiresAtMs: now + MAGIC_LINK_TTL_MS,
      consumedAtMs: null,
      payload: {
        email,
        ...(termsAcceptedAt ? { termsAcceptedAt } : {}),
        ...(privacyAcceptedAt ? { privacyAcceptedAt } : {}),
        ...(marketingConsent ? { marketingConsent } : {}),
        ...(referralCode ? { referralCode } : {}),
      },
    });
    const url = `${consumerOrigin()}/auth/magic?token=${token}`;
    const sent = await this.resend.sendMagicLink({ to: email, url });
    if (!sent.ok) {
      // A genuine transport failure must never be reported as success -
      // the previous version of this method returned {ok:true} on BOTH
      // branches here, which is the exact bug this fixes. The thrown
      // message is identical regardless of whether `email` has an account
      // (it is about Resend being unreachable, not about the account).
      throw new ServiceUnavailableException("EMAIL_SEND_UNAVAILABLE");
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
   * Fails if there is no token. Email-only is rejected immediately.
   * New user + no stored consent -> TERMS_REQUIRED (does not consume the
   * token - the caller can re-request with consent, or the same session
   * elsewhere may still complete it before it expires).
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
      // Server-owned consent, captured at request() time - never read from
      // this call's own body (see this file's top-of-file doc comment).
      const terms =
        typeof fresh.payload.termsAcceptedAt === "string" &&
        fresh.payload.termsAcceptedAt.trim();
      const privacy =
        typeof fresh.payload.privacyAcceptedAt === "string" &&
        fresh.payload.privacyAcceptedAt.trim();
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
