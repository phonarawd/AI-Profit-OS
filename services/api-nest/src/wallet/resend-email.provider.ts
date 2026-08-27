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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  async sendMagicLink(input: {
    to: string;
    loginUrl: string;
  }): Promise<ResendSendResult> {
    const env = loadPhase0Env();
    this.assertFromConfigured();
    if (!env.resendApiKey) {
      if (env.nodeEnv === "production") {
        return { ok: false, provider: "resend", reason: "resend_not_configured" };
      }
      this.log.warn("RESEND_API_KEY unset — magic link accepted_dev (not sent)");
      return { ok: true, provider: "resend", status: "accepted_dev" };
    }

    const safeUrl = this.escapeHtml(input.loginUrl);
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
        html:
          `<p>퍼뜩 로그인을 요청하셨다면 아래 버튼을 눌러 주세요.</p>` +
          `<p><a href="${safeUrl}">퍼뜩 로그인하기</a></p>` +
          `<p>본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>`,
      }),
    });

    if (!res.ok) {
      this.log.error(`Resend magic-link send failed ${res.status}`);
      return {
        ok: false,
        provider: "resend",
        reason: `resend_http_${res.status}`,
      };
    }
    return { ok: true, provider: "resend", status: "sent" };
  }

  async sendOtp(input: {
    to: string;
    code: string;
    purpose: "withdraw_stepup" | "magic_link";
  }): Promise<ResendSendResult> {
    const env = loadPhase0Env();
    this.assertFromConfigured();
    if (!env.resendApiKey) {
      if (env.nodeEnv === "production") {
        return { ok: false, provider: "resend", reason: "resend_not_configured" };
      }
      // Dev without key: accept without network (never log OTP)
      this.log.warn("RESEND_API_KEY unset — OTP accepted_dev (not sent)");
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
}
