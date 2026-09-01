/**
 * #80 identity-proof runtime — Nest HTTP 없이 증명 계층 성공/실패.
 * 세션 mint 는 prove 성공 뒤에만 호출되는 콜백으로 관측한다.
 */
import { MagicLinkService } from "./magic-link.service";
import { OauthIdentityService, type OauthHttp } from "./oauth-identity.service";
import { WebauthnAssertService } from "./webauthn-assert.service";
import { MemoryProofStore } from "./identity-proof.store";
import {
  EMAIL_MAX_LEN,
  exportSpkiDer,
  generateTestEs256,
  isValidEmail,
  signEs256P1363,
  sha256,
} from "./identity-proof.crypto";
import type { AuthWebauthnRp } from "./webauthn-rp";
import type { ResendSendResult } from "../wallet/resend-email.provider";

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function pass(name: string, detail = ""): void {
  checks.push({ name, ok: true, detail });
  console.log(`PASS - ${name}${detail ? ` (${detail})` : ""}`);
}

function fail(name: string, detail: string): void {
  checks.push({ name, ok: false, detail });
  console.error(`FAIL - ${name} (${detail})`);
}

async function expectThrow(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
    fail(name, "expected throw");
  } catch (e) {
    pass(name, e instanceof Error ? e.message : "threw");
  }
}

class FakeResend {
  sent: { to: string; url: string }[] = [];
  failNext = false;
  async sendMagicLink(input: { to: string; url: string }): Promise<ResendSendResult> {
    if (this.failNext) {
      this.failNext = false;
      return { ok: false, provider: "resend", reason: "forced" };
    }
    this.sent.push(input);
    return { ok: true, provider: "resend", status: "sent" };
  }
}

function tokenFromUrl(url: string): string {
  return new URL(url).searchParams.get("token") ?? "";
}

const TEST_RP: AuthWebauthnRp = {
  rpId: "example.test",
  appHost: "app.example.test",
  origin: "https://app.example.test",
  rpName: "퍼뜩",
};

function buildAssertion(input: {
  type: "webauthn.create" | "webauthn.get";
  challenge: string;
  origin: string;
  rpId: string;
  signCount: number;
  privateKey: ReturnType<typeof generateTestEs256>["privateKey"];
}) {
  const clientData = {
    type: input.type,
    challenge: input.challenge,
    origin: input.origin,
  };
  const clientDataJSON = Buffer.from(JSON.stringify(clientData)).toString("base64url");
  const count = Buffer.alloc(4);
  count.writeUInt32BE(input.signCount);
  const authData = Buffer.concat([sha256(input.rpId), Buffer.from([0x05]), count]);
  const signed = Buffer.concat([authData, sha256(Buffer.from(clientDataJSON, "base64url"))]);
  return {
    clientDataJSON,
    authenticatorData: authData.toString("base64url"),
    signature: signEs256P1363(input.privateKey, signed).toString("base64url"),
  };
}

async function run(): Promise<void> {
  let minted = 0;
  const mint = () => {
    minted += 1;
  };

  {
    const cases: Array<[string, boolean]> = [
      ["user@example.com", true],
      ["user+tag@ex.co.kr", true],
      ["a@b.c", true],
      ["@example.com", false],
      ["user@", false],
      ["user@example", false],
      ["user@example.", false],
      ["user@.com", false],
      ["user@ex@ample.com", false],
      ["user example@x.com", false],
      ["user@exam ple.com", false],
    ];
    for (const [email, expected] of cases) {
      if (isValidEmail(email) === expected) {
        pass(`email ${expected ? "accept" : "reject"} ${email}`);
      } else {
        fail(`email ${email}`, `expected ${expected}`);
      }
    }
    const oversize = `a@b.${"c".repeat(EMAIL_MAX_LEN)}`;
    if (!isValidEmail(oversize) && oversize.length > EMAIL_MAX_LEN) {
      pass("email rejects oversize");
    } else {
      fail("email oversize", `len=${oversize.length} valid=${isValidEmail(oversize)}`);
    }
    const adversarial = `user@${"a.".repeat(10_000)}a`;
    const t0 = Date.now();
    const adversarialOk = isValidEmail(adversarial);
    const adversarialMs = Date.now() - t0;
    if (adversarialMs <= 20 && adversarialOk === false) {
      pass("email adversarial long input is linear", `${adversarialMs}ms`);
    } else {
      fail("email adversarial", `ms=${adversarialMs} ok=${adversarialOk}`);
    }
    const manyDots = `u@${"a.".repeat(80)}a`;
    const t1 = Date.now();
    const manyOk = isValidEmail(manyDots);
    const manyMs = Date.now() - t1;
    if (manyMs <= 20 && manyOk === true) {
      pass("email many-dot domain is linear", `${manyMs}ms`);
    } else {
      fail("email many-dot", `ms=${manyMs} ok=${manyOk}`);
    }
  }

  // ── Magic link ──
  {
    const store = new MemoryProofStore();
    const resend = new FakeResend();
    const magic = new MagicLinkService(store, resend as never);
    minted = 0;
    const req = await magic.request({ email: "user@example.com" });
    if (req.status !== "accepted" || req.delivery !== "resend") {
      fail("magic request accepted", JSON.stringify(req));
    } else {
      pass("magic request accepted — no session");
    }
    if (minted !== 0) fail("magic request must not mint", `minted=${minted}`);
    const raw = JSON.stringify(req);
    if (raw.includes(tokenFromUrl(resend.sent[0]?.url ?? "https://x/?token=none"))) {
      fail("magic request must not echo token", raw);
    } else {
      pass("magic request does not echo token");
    }
    const token = tokenFromUrl(resend.sent[0].url);
    await expectThrow("magic email-only prove", () =>
      magic.prove({ email: "user@example.com" }, { userExists: true }),
    );
    await expectThrow("magic malformed token", () =>
      magic.prove({ token: "short" }, { userExists: true }),
    );
    const newUser = await expectThrow("magic new user without terms", async () => {
      const out = await magic.prove({ token }, { userExists: false });
      mint();
      return out;
    });
    void newUser;
    const proven = await magic.prove(
      {
        token,
        termsAcceptedAt: "2026-09-01T00:00:00.000Z",
        privacyAcceptedAt: "2026-09-01T00:00:00.000Z",
      },
      { userExists: false },
    );
    if (proven.email === "user@example.com") {
      mint();
      pass("magic valid token proves email");
    } else {
      fail("magic valid token", JSON.stringify(proven));
    }
    await expectThrow("magic replay", () =>
      magic.prove(
        {
          token,
          termsAcceptedAt: "2026-09-01T00:00:00.000Z",
          privacyAcceptedAt: "2026-09-01T00:00:00.000Z",
        },
        { userExists: false },
      ),
    );
  }

  {
    const store = new MemoryProofStore();
    const resend = new FakeResend();
    let now = Date.now();
    const magic = new MagicLinkService(store, resend as never, () => now);
    await magic.request({ email: "exp@example.com" });
    const token = tokenFromUrl(resend.sent[0].url);
    now += 16 * 60 * 1000;
    await expectThrow("magic expired", () =>
      magic.prove({ token }, { userExists: true }),
    );
  }

  {
    const store = new MemoryProofStore();
    const resend = new FakeResend();
    resend.failNext = true;
    const magic = new MagicLinkService(store, resend as never);
    minted = 0;
    const out = await magic.request({ email: "fail@example.com" });
    if (out.status === "accepted" && minted === 0) {
      pass("magic send failure does not mint");
    } else {
      fail("magic send failure", JSON.stringify(out));
    }
  }

  // ── OAuth ──
  {
    const store = new MemoryProofStore();
    const http: OauthHttp = {
      async tokenExchange() {
        return { accessToken: "provider-access" };
      },
      async fetchProfile() {
        return {
          subject: "kakao-99",
          email: "k@example.com",
          emailVerified: true,
          issuer: "https://kauth.kakao.com",
        };
      },
    };
    process.env.OAUTH_KAKAO_CLIENT_ID = "kakao-id";
    process.env.OAUTH_KAKAO_CLIENT_SECRET = "kakao-secret";
    const oauth = new OauthIdentityService(store, http);
    await expectThrow("oauth providerSubject only", () =>
      oauth.prove("kakao", { providerSubject: "attacker" }),
    );
    await expectThrow("oauth code without state", () =>
      oauth.prove("kakao", { code: "abc" }),
    );
    await expectThrow("oauth bad state", () =>
      oauth.prove("kakao", { code: "abc", state: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
    );

    const started = await oauth.startReady("kakao");
    if (started.status !== "ready") {
      fail("oauth start ready", JSON.stringify(started));
    } else if (!started.authorizeUrl.includes("state=")) {
      fail("oauth start missing state", started.authorizeUrl);
    } else {
      pass("oauth start includes state");
    }
    const state = new URL(started.status === "ready" ? started.authorizeUrl : "https://x")
      .searchParams.get("state") ?? "";
    minted = 0;
    const proven = await oauth.prove("kakao", { code: "server-code", state });
    if (proven.providerSubject === "kakao-99") {
      mint();
      pass("oauth server profile subject wins");
    } else {
      fail("oauth subject", JSON.stringify(proven));
    }
    await expectThrow("oauth state replay", () =>
      oauth.prove("kakao", { code: "server-code", state }),
    );
  }

  {
    const store = new MemoryProofStore();
    const http: OauthHttp = {
      async tokenExchange() {
        throw new Error("exchange failed");
      },
      async fetchProfile() {
        return { subject: "x", issuer: "https://kauth.kakao.com" };
      },
    };
    const oauth = new OauthIdentityService(store, http);
    const started = await oauth.startReady("kakao");
    const state =
      started.status === "ready"
        ? new URL(started.authorizeUrl).searchParams.get("state") ?? ""
        : "";
    minted = 0;
    await expectThrow("oauth exchange failure", () =>
      oauth.prove("kakao", { code: "z", state }),
    );
    if (minted === 0) pass("oauth exchange failure does not mint");
  }

  {
    const store = new MemoryProofStore();
    const http: OauthHttp = {
      async tokenExchange() {
        return { accessToken: "g" };
      },
      async fetchProfile() {
        return {
          subject: "google-1",
          email: "browser@evil.test",
          emailVerified: false,
          issuer: "https://accounts.google.com",
        };
      },
    };
    process.env.OAUTH_GOOGLE_CLIENT_ID = "gid";
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = "gsecret";
    const oauth = new OauthIdentityService(store, http);
    const started = await oauth.startReady("google");
    const state =
      started.status === "ready"
        ? new URL(started.authorizeUrl).searchParams.get("state") ?? ""
        : "";
    const proven = await oauth.prove("google", {
      code: "g-code",
      state,
      email: "browser@evil.test",
    });
    if (proven.email) {
      fail("unverified provider email must be dropped", String(proven.email));
    } else if (proven.providerSubject === "google-1") {
      pass("unverified email dropped, subject kept");
    } else {
      fail("google prove", JSON.stringify(proven));
    }
  }

  // ── WebAuthn ──
  {
    const store = new MemoryProofStore();
    const webauthn = new WebauthnAssertService(store, Date.now, TEST_RP);
    const keys = generateTestEs256();
    const pub = exportSpkiDer(keys.publicKey);
    const opts = await webauthn.options("register");
    minted = 0;
    await expectThrow("webauthn credentialId only", () =>
      webauthn.prove("register", { credentialId: "cred-1" }, {
        findByCredentialId: async () => null,
      }),
    );
    const assertion = buildAssertion({
      type: "webauthn.create",
      challenge: opts.challenge,
      origin: TEST_RP.origin,
      rpId: TEST_RP.rpId,
      signCount: 1,
      privateKey: keys.privateKey,
    });
    const registered = await webauthn.prove(
      "register",
      {
        credentialId: "cred-1",
        publicKey: pub.toString("base64url"),
        ...assertion,
      },
      { findByCredentialId: async () => null },
    );
    if (registered.credentialId === "cred-1") {
      mint();
      pass("webauthn register valid assertion");
    } else {
      fail("webauthn register", JSON.stringify(registered));
    }

    const authOpts = await webauthn.options("authenticate");
    const authAssertion = buildAssertion({
      type: "webauthn.get",
      challenge: authOpts.challenge,
      origin: TEST_RP.origin,
      rpId: TEST_RP.rpId,
      signCount: 2,
      privateKey: keys.privateKey,
    });
    const authed = await webauthn.prove(
      "authenticate",
      { credentialId: "cred-1", ...authAssertion },
      {
        findByCredentialId: async () => ({
          credentialId: "cred-1",
          publicKeySpki: pub,
          signCount: 1,
        }),
      },
    );
    if (authed.signCount === 2) pass("webauthn authenticate valid assertion");
    else fail("webauthn authenticate", JSON.stringify(authed));

    await expectThrow("webauthn challenge replay", () =>
      webauthn.prove(
        "authenticate",
        { credentialId: "cred-1", ...authAssertion },
        {
          findByCredentialId: async () => ({
            credentialId: "cred-1",
            publicKeySpki: pub,
            signCount: 1,
          }),
        },
      ),
    );

    const badOriginOpts = await webauthn.options("authenticate");
    const badOrigin = buildAssertion({
      type: "webauthn.get",
      challenge: badOriginOpts.challenge,
      origin: "https://evil.test",
      rpId: TEST_RP.rpId,
      signCount: 3,
      privateKey: keys.privateKey,
    });
    await expectThrow("webauthn wrong origin", () =>
      webauthn.prove(
        "authenticate",
        { credentialId: "cred-1", ...badOrigin },
        {
          findByCredentialId: async () => ({
            credentialId: "cred-1",
            publicKeySpki: pub,
            signCount: 2,
          }),
        },
      ),
    );

    const badRpOpts = await webauthn.options("authenticate");
    const badRp = buildAssertion({
      type: "webauthn.get",
      challenge: badRpOpts.challenge,
      origin: TEST_RP.origin,
      rpId: "evil.test",
      signCount: 3,
      privateKey: keys.privateKey,
    });
    await expectThrow("webauthn wrong rpId", () =>
      webauthn.prove(
        "authenticate",
        { credentialId: "cred-1", ...badRp },
        {
          findByCredentialId: async () => ({
            credentialId: "cred-1",
            publicKeySpki: pub,
            signCount: 2,
          }),
        },
      ),
    );

    const replayCountOpts = await webauthn.options("authenticate");
    const replayCount = buildAssertion({
      type: "webauthn.get",
      challenge: replayCountOpts.challenge,
      origin: TEST_RP.origin,
      rpId: TEST_RP.rpId,
      signCount: 1,
      privateKey: keys.privateKey,
    });
    await expectThrow("webauthn signCount replay", () =>
      webauthn.prove(
        "authenticate",
        { credentialId: "cred-1", ...replayCount },
        {
          findByCredentialId: async () => ({
            credentialId: "cred-1",
            publicKeySpki: pub,
            signCount: 2,
          }),
        },
      ),
    );

    const otherKeys = generateTestEs256();
    const badSigOpts = await webauthn.options("authenticate");
    const badSig = buildAssertion({
      type: "webauthn.get",
      challenge: badSigOpts.challenge,
      origin: TEST_RP.origin,
      rpId: TEST_RP.rpId,
      signCount: 4,
      privateKey: otherKeys.privateKey,
    });
    await expectThrow("webauthn bad signature", () =>
      webauthn.prove(
        "authenticate",
        { credentialId: "cred-1", ...badSig },
        {
          findByCredentialId: async () => ({
            credentialId: "cred-1",
            publicKeySpki: pub,
            signCount: 2,
          }),
        },
      ),
    );
  }

  {
    const store = new MemoryProofStore();
    let now = Date.now();
    const webauthn = new WebauthnAssertService(store, () => now, TEST_RP);
    const keys = generateTestEs256();
    const opts = await webauthn.options("authenticate");
    now += 6 * 60 * 1000;
    const assertion = buildAssertion({
      type: "webauthn.get",
      challenge: opts.challenge,
      origin: TEST_RP.origin,
      rpId: TEST_RP.rpId,
      signCount: 1,
      privateKey: keys.privateKey,
    });
    await expectThrow("webauthn expired challenge", () =>
      webauthn.prove(
        "authenticate",
        { credentialId: "cred-1", ...assertion },
        {
          findByCredentialId: async () => ({
            credentialId: "cred-1",
            publicKeySpki: exportSpkiDer(keys.publicKey),
            signCount: 0,
          }),
        },
      ),
    );
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`[identity-proof.selftest] FAIL ${failed.length}/${checks.length}`);
    process.exit(1);
  }
  console.log(`[identity-proof.selftest] ALL PASS — ${checks.length} checks`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
