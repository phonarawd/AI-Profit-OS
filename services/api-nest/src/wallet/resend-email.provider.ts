/**
 * Money §43.6 · Infra — Day-1 SMTP SSOT = Resend free tier.
 * Used by withdraw Email OTP + auth magic-link path (same provider lock).
 * SMS OTP = L2 optional · not Day-1 required.
 */

import { Injectable, Logger } from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { WITHDRAW_EMAIL_PROVIDER } from "./withdraw-stepup.policy";

export type ResendSendResult =
  | { ok: true; provider: "resend"; status: "sent" | "accepted_dev" }
  | { ok: false; provider: "resend"; reason: string };

@Injectable()
export class ResendEmailProvider {
  private readonly log = new Logger(ResendEmailProvider.name);

  readonly provider = WITHDRAW_EMAIL_PROVIDER;

  configured(): boolean {
    const env = loadPhase0Env();
    return Boolean(env.resendApiKey && env.resendFromEmail);
  }

  /** From-domain must be present (verified domain in Resend dashboard). */
  assertFromConfigured(): void {
    const env = loadPhase0Env();
    if (!env.resendFromEmail) {
      throw new Error("RESEND_FROM_EMAIL required (verified domain)");
    }
    if (!env.resendFromEmail.includes("@")) {
      throw new Error("RESEND_FROM_EMAIL must be email@verified-domain");
    }
  }

  /**
   * Section 6.2 fail-closed check - production/staging must never boot (or
   * report ready) without a real Resend API key + verified from-domain.
   * Call this once at process bootstrap (main.ts) so a misconfigured
   * production deploy fails loudly at startup instead of silently minting
   * "accepted_dev" responses for real users.
   */
  assertReadyForEnv(): void {
    const env = loadPhase0Env();
    if (env.nodeEnv !== "production" && env.nodeEnv !== "staging") return;
    if (!env.resendApiKey || !env.resendFromEmail) {
      throw new Error(
        `RESEND_API_KEY and RESEND_FROM_EMAIL are both required when NODE_ENV=${env.nodeEnv} - refusing to start with the dev-only accepted_dev bypass reachable in this environment`,
      );
    }
  }

  async sendOtp(input: {
    to: string;
    code: string;
    purpose: "withdraw_stepup" | "magic_link";
  }): Promise<ResendSendResult> {
    const env = loadPhase0Env();
    this.assertFromConfigured();
    if (!env.resendApiKey) {
      if (env.nodeEnv === "production" || env.nodeEnv === "staging") {
        // Section 6.2 - never silently bypass in an env real users reach.
        // assertReadyForEnv() should already have stopped this at
        // bootstrap; this is defense-in-depth for a post-boot env change.
        throw new Error(`RESEND_API_KEY unset while NODE_ENV=${env.nodeEnv}`);
      }
      // Dev/test without key: accept without network (never log OTP)
      this.log.warn("RESEND_API_KEY unset - OTP accepted_dev (not sent)");
      return { ok: true, provider: "resend", status: "accepted_dev" };
    }

    const subject =
      input.purpose === "withdraw_stepup"
        ? "퍼뜩 출금 확인 코드"
        : "퍼뜩 로그인 링크";
    const html =
      input.purpose === "withdraw_stepup"
        ? `<p>출금 확인 코드: <strong>${input.code}</strong></p><p>60초 안에 입력해 주세요.</p>`
        : `<p>로그인 요청이 접수됐어요.</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [input.to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.log.error(`Resend send failed ${res.status}`);
      return {
        ok: false,
        provider: "resend",
        reason: `resend_http_${res.status}:${body.slice(0, 120)}`,
      };
    }
    return { ok: true, provider: "resend", status: "sent" };
  }

  /** Magic link — 실제 일회용 URL. raw token 을 로그에 남기지 않는다. */
  async sendMagicLink(input: {
    to: string;
    url: string;
  }): Promise<ResendSendResult> {
    const env = loadPhase0Env();
    this.assertFromConfigured();
    if (!env.resendApiKey) {
      if (env.nodeEnv === "production" || env.nodeEnv === "staging") {
        throw new Error(`RESEND_API_KEY unset while NODE_ENV=${env.nodeEnv}`);
      }
      this.log.warn("RESEND_API_KEY unset - magic link accepted_dev (not sent)");
      return { ok: true, provider: "resend", status: "accepted_dev" };
    }
    const safeUrl = input.url.trim();
    if (!/^https?:\/\//i.test(safeUrl) || safeUrl.length > 2000) {
      return { ok: false, provider: "resend", reason: "magic_link_url_invalid" };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [input.to],
        subject: "퍼뜩 로그인 링크",
        html: `<p><a href="${safeUrl}">로그인하려면 이 링크를 눌러 주세요.</a></p><p>이 링크는 한 번만 쓸 수 있어요.</p>`,
      }),
    });
    if (!res.ok) {
      this.log.error(`Resend send failed ${res.status}`);
      return {
        ok: false,
        provider: "resend",
        reason: `resend_http_${res.status}`,
      };
    }
    return { ok: true, provider: "resend", status: "sent" };
  }

  private async sendSimpleLink(input: {
    to: string;
    url: string;
    subject: string;
    bodyHtml: string;
  }): Promise<ResendSendResult> {
    const env = loadPhase0Env();
    this.assertFromConfigured();
    if (!env.resendApiKey) {
      if (env.nodeEnv === "production" || env.nodeEnv === "staging") {
        throw new Error(`RESEND_API_KEY unset while NODE_ENV=${env.nodeEnv}`);
      }
      this.log.warn("RESEND_API_KEY unset - link email accepted_dev (not sent)");
      return { ok: true, provider: "resend", status: "accepted_dev" };
    }
    const safeUrl = input.url.trim();
    if (!/^https?:\/\//i.test(safeUrl) || safeUrl.length > 2000) {
      return { ok: false, provider: "resend", reason: "link_url_invalid" };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.bodyHtml,
      }),
    });
    if (!res.ok) {
      this.log.error(`Resend send failed ${res.status}`);
      return { ok: false, provider: "resend", reason: `resend_http_${res.status}` };
    }
    return { ok: true, provider: "resend", status: "sent" };
  }

  /** Classic signup - one-time email ownership verification link. */
  async sendSignupVerification(input: { to: string; url: string }): Promise<ResendSendResult> {
    return this.sendSimpleLink({
      to: input.to,
      url: input.url,
      subject: "퍼뜩 이메일 인증",
      bodyHtml: `<p>회원가입을 완료하려면 이 링크를 눌러 주세요.</p><p><a href="${input.url}">이메일 인증하기</a></p><p>이 링크는 한 번만 쓸 수 있어요.</p>`,
    });
  }

  async sendPasswordReset(input: { to: string; url: string }): Promise<ResendSendResult> {
    return this.sendSimpleLink({
      to: input.to,
      url: input.url,
      subject: "퍼뜩 비밀번호 재설정 안내",
      bodyHtml: `<p>비밀번호 재설정 링크: <a href="${input.url}">여기</a></p>`,
    });
  }

  async sendFindIdResult(input: { to: string; maskedUsernames: string[] }): Promise<ResendSendResult> {
    const env = loadPhase0Env();
    this.assertFromConfigured();
    if (!env.resendApiKey) {
      if (env.nodeEnv === "production" || env.nodeEnv === "staging") {
        throw new Error(`RESEND_API_KEY unset while NODE_ENV=${env.nodeEnv}`);
      }
      this.log.warn("RESEND_API_KEY unset - find-id accepted_dev (not sent)");
      return { ok: true, provider: "resend", status: "accepted_dev" };
    }
    const list = input.maskedUsernames.map((u) => `<li>${u}</li>`).join("");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [input.to],
        subject: "퍼뜩 아이디 찾기 결과",
        html: `<p>이 이메일로 가입된 아이디입니다.</p><ul>${list}</ul>`,
      }),
    });
    if (!res.ok) {
      this.log.error(`Resend send failed ${res.status}`);
      return { ok: false, provider: "resend", reason: `resend_http_${res.status}` };
    }
    return { ok: true, provider: "resend", status: "sent" };
  }
}
