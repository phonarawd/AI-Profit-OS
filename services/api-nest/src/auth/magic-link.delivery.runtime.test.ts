import assert from "node:assert/strict";
import { test } from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { MagicLinkService } from "./magic-link.service.ts";
import type { ResendEmailProvider } from "../wallet/resend-email.provider.ts";

function providerWith(
  sendMagicLink: ResendEmailProvider["sendMagicLink"],
): ResendEmailProvider {
  return { sendMagicLink } as unknown as ResendEmailProvider;
}

function requestOnlyStore() {
  return {
    async put() {},
    async findFresh() {
      return null;
    },
    async consumeAtomic() {
      return null;
    },
  };
}

test("magic-link provider failure is fail-closed and never returns accepted", async () => {
  const previousAppHost = process.env.APP_HOST;
  process.env.APP_HOST = "app.hiptk.app";
  try {
    const service = new MagicLinkService(
      requestOnlyStore(),
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
