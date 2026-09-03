import assert from "node:assert/strict";
import { test } from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { MagicLinkService } from "./magic-link.service";
import { ResendEmailProvider } from "../wallet/resend-email.provider";

function providerWith(
  sendMagicLink: ResendEmailProvider["sendMagicLink"],
): ResendEmailProvider {
  return { sendMagicLink } as unknown as ResendEmailProvider;
}

function requestOnlyStore(onConsume?: () => void) {
  return {
    async put() {},
    async findFresh() {
      return null;
    },
    async consumeAtomic() {
      onConsume?.();
      return null;
    },
  };
}

test("Resend missing key fails closed in staging instead of accepted_dev", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  process.env.NODE_ENV = "staging";
  delete process.env.RESEND_API_KEY;
  process.env.RESEND_FROM_EMAIL = "noreply@hiptk.app";
  try {
    const result = await new ResendEmailProvider().sendMagicLink({
      to: "user@example.com",
      url: "https://app.hiptk.app/auth/magic?token=test",
    });
    assert.deepEqual(result, {
      ok: false,
      provider: "resend",
      reason: "resend_api_key_missing",
    });
  } finally {
    if (previousNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousApiKey == null) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom == null) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});

test("magic-link provider failure is fail-closed and never returns accepted", async () => {
  const previousAppHost = process.env.APP_HOST;
  process.env.APP_HOST = "app.hiptk.app";
  let consumed = 0;
  try {
    const service = new MagicLinkService(
      requestOnlyStore(() => {
        consumed += 1;
      }),
      providerWith(async () => ({
        ok: false,
        provider: "resend",
        reason: "provider_rejected",
      })),
      () => Date.UTC(2026, 8, 2),
    );

    await assert.rejects(
      () => service.request({ email: "user@example.com" }),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.equal(error.message, "MAGIC_LINK_DELIVERY_UNAVAILABLE");
        return true;
      },
    );
    assert.equal(consumed, 1);
  } finally {
    if (previousAppHost == null) delete process.env.APP_HOST;
    else process.env.APP_HOST = previousAppHost;
  }
});

test("magic-link provider exception is normalized to 503 and invalidates challenge", async () => {
  const previousAppHost = process.env.APP_HOST;
  process.env.APP_HOST = "app.hiptk.app";
  let consumed = 0;
  try {
    const service = new MagicLinkService(
      requestOnlyStore(() => {
        consumed += 1;
      }),
      providerWith(async () => {
        throw new Error("RESEND_FROM_EMAIL required (verified domain)");
      }),
      () => Date.UTC(2026, 8, 2),
    );

    await assert.rejects(
      () => service.request({ email: "user@example.com" }),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.equal(error.message, "MAGIC_LINK_DELIVERY_UNAVAILABLE");
        assert.doesNotMatch(error.message, /RESEND_FROM_EMAIL|verified-domain/i);
        return true;
      },
    );
    assert.equal(consumed, 1);
  } finally {
    if (previousAppHost == null) delete process.env.APP_HOST;
    else process.env.APP_HOST = previousAppHost;
  }
});

test("magic-link returns accepted only after provider success", async () => {
  const previousAppHost = process.env.APP_HOST;
  process.env.APP_HOST = "app.hiptk.app";
  try {
    let sentUrl = "";
    const service = new MagicLinkService(
      requestOnlyStore(),
      providerWith(async ({ url }) => {
        sentUrl = url;
        return { ok: true, provider: "resend", status: "sent" };
      }),
      () => Date.UTC(2026, 8, 2),
    );

    const result = await service.request({ email: "user@example.com" });

    assert.deepEqual(result, {
      ok: true,
      delivery: "resend",
      status: "accepted",
    });
    assert.match(sentUrl, /^https:\/\/app\.hiptk\.app\/auth\/magic\?token=/);
  } finally {
    if (previousAppHost == null) delete process.env.APP_HOST;
    else process.env.APP_HOST = previousAppHost;
  }
});
