/**
 * OAuth — caller providerSubject / raw code-as-subject / browser email 금지.
 * state 검증 + 서버 code exchange + provider 가 준 immutable subject 만 신뢰.
 */

import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  loadPhase0Env,
  oauthConfigured,
  type Phase0Env,
} from "../config/phase0.env";
import {
  OAUTH_STATE_TTL_MS,
  apiOrigin,
  consumerOrigin,
  hashProofSecret,
  randomProofSecret,
} from "./identity-proof.crypto";
import type { ProofChallengeStore } from "./identity-proof.store";
import type { OauthProvider } from "./auth.constants";

export type OauthStartView =
  | {
      ok: true;
      provider: OauthProvider;
      status: "not_configured";
      message: string;
    }
  | {
      ok: true;
      provider: OauthProvider;
      status: "ready";
      authorizeUrl: string;
    };

export type ProvenOauthIdentity = {
  provider: OauthProvider;
  providerSubject: string;
  email?: string;
};

export type OauthHttp = {
  tokenExchange(input: {
    provider: OauthProvider;
    code: string;
    redirectUri: string;
    env: Phase0Env;
  }): Promise<{ accessToken: string }>;
  fetchProfile(input: {
    provider: OauthProvider;
    accessToken: string;
  }): Promise<{
    subject: string;
    email?: string;
    emailVerified?: boolean;
    issuer: string;
  }>;
};

export function oauthRedirectUri(provider: OauthProvider, env = loadPhase0Env()): string {
  return `${consumerOrigin(env)}/auth/oauth/${provider}/callback`;
}

export function defaultOauthHttp(): OauthHttp {
  return {
    async tokenExchange({ provider, code, redirectUri, env }) {
      if (provider === "kakao") {
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: env.oauthKakaoClientId ?? "",
          client_secret: env.oauthKakaoClientSecret ?? "",
          redirect_uri: redirectUri,
          code,
        });
        const res = await fetch("https://kauth.kakao.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!res.ok) throw new Error("oauth_token_exchange_failed");
        const json = (await res.json()) as { access_token?: unknown };
        if (typeof json.access_token !== "string" || !json.access_token) {
          throw new Error("oauth_token_exchange_failed");
        }
        return { accessToken: json.access_token };
      }
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.oauthGoogleClientId ?? "",
        client_secret: env.oauthGoogleClientSecret ?? "",
        redirect_uri: redirectUri,
        code,
      });
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error("oauth_token_exchange_failed");
      const json = (await res.json()) as { access_token?: unknown };
      if (typeof json.access_token !== "string" || !json.access_token) {
        throw new Error("oauth_token_exchange_failed");
      }
      return { accessToken: json.access_token };
    },
    async fetchProfile({ provider, accessToken }) {
      if (provider === "kakao") {
        const res = await fetch("https://kapi.kakao.com/v2/user/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("oauth_profile_failed");
        const json = (await res.json()) as {
          id?: unknown;
          kakao_account?: { email?: unknown; is_email_valid?: unknown; is_email_verified?: unknown };
        };
        const subject = json.id != null ? String(json.id) : "";
        if (!subject) throw new Error("oauth_profile_failed");
        const email =
          typeof json.kakao_account?.email === "string"
            ? json.kakao_account.email
            : undefined;
        const verified =
          json.kakao_account?.is_email_verified === true &&
          json.kakao_account?.is_email_valid === true;
        return {
          subject,
          email: verified ? email : undefined,
          emailVerified: verified,
          issuer: "https://kauth.kakao.com",
        };
      }
      const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("oauth_profile_failed");
      const json = (await res.json()) as {
        sub?: unknown;
        email?: unknown;
        email_verified?: unknown;
        iss?: unknown;
      };
      const subject = typeof json.sub === "string" ? json.sub : "";
      if (!subject) throw new Error("oauth_profile_failed");
      const issuer = typeof json.iss === "string" ? json.iss : "https://accounts.google.com";
      if (
        issuer !== "https://accounts.google.com" &&
        issuer !== "accounts.google.com"
      ) {
        throw new Error("oauth_issuer_mismatch");
      }
      const verified = json.email_verified === true;
      return {
        subject,
        email:
          verified && typeof json.email === "string" ? json.email : undefined,
        emailVerified: verified,
        issuer,
      };
    },
  };
}

export class OauthIdentityService {
  constructor(
    private readonly store: ProofChallengeStore,
    private readonly http: OauthHttp = defaultOauthHttp(),
    private readonly nowMs: () => number = Date.now,
  ) {}

  async startReady(provider: OauthProvider): Promise<OauthStartView> {
    const env = loadPhase0Env();
    if (!oauthConfigured(env, provider)) {
      return {
        ok: true,
        provider,
        status: "not_configured",
        message:
          "Set OAUTH_*_CLIENT_ID/SECRET in .env (Phase0 hosts) — never commit secrets",
      };
    }
    const state = randomProofSecret();
    await this.store.put({
      kind: "oauth_state",
      hash: hashProofSecret(state),
      expiresAtMs: this.nowMs() + OAUTH_STATE_TTL_MS,
      consumedAtMs: null,
      payload: { provider },
    });
    const redirectUri = oauthRedirectUri(provider, env);
    if (provider === "kakao") {
      const u = new URL("https://kauth.kakao.com/oauth/authorize");
      u.searchParams.set("client_id", env.oauthKakaoClientId!);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("response_type", "code");
      u.searchParams.set("state", state);
      return {
        ok: true,
        provider,
        status: "ready",
        authorizeUrl: u.toString(),
      };
    }
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", env.oauthGoogleClientId!);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("state", state);
    return {
      ok: true,
      provider,
      status: "ready",
      authorizeUrl: u.toString(),
    };
  }

  async prove(
    provider: OauthProvider,
    body: Record<string, unknown>,
  ): Promise<ProvenOauthIdentity> {
    if (body?.providerSubject != null && String(body.providerSubject).length > 0) {
      throw new BadRequestException("caller providerSubject is not identity authority");
    }
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!state || !code) {
      throw new BadRequestException("oauth state and code required");
    }
    const env = loadPhase0Env();
    if (!oauthConfigured(env, provider)) {
      throw new ServiceUnavailableException("oauth provider not configured");
    }
    const consumed = await this.store.consumeAtomic(
      "oauth_state",
      hashProofSecret(state),
      this.nowMs(),
    );
    if (!consumed || consumed.payload.provider !== provider) {
      throw new BadRequestException("oauth state invalid");
    }
    let accessToken: string;
    try {
      const exchanged = await this.http.tokenExchange({
        provider,
        code,
        redirectUri: oauthRedirectUri(provider, env),
        env,
      });
      accessToken = exchanged.accessToken;
    } catch {
      throw new BadRequestException("oauth code exchange failed");
    }
    let profile: Awaited<ReturnType<OauthHttp["fetchProfile"]>>;
    try {
      profile = await this.http.fetchProfile({ provider, accessToken });
    } catch {
      throw new BadRequestException("oauth provider profile failed");
    }
    if (!profile.subject) {
      throw new BadRequestException("oauth provider subject missing");
    }
    void apiOrigin(env);
    return {
      provider,
      providerSubject: profile.subject,
      email: profile.emailVerified === true ? profile.email : undefined,
    };
  }
}
