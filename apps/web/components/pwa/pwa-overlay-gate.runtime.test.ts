import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientPushHintDisabled,
  isInstallOverlayAllowed,
  isPushOverlayAllowed,
  shouldSuppressPwaChrome,
} from "./suppress-pwa-chrome.ts";

const SUPPRESS = [
  "/onboarding",
  "/onboarding/kyc",
  "/wallet/deposit",
  "/wallet/deposit/krw",
  "/wallet/withdraw",
  "/wallet/withdraw/usdt",
  "/trades/abc/execute",
  "/trades/abc/execute/confirm",
  "/profits/opp-1",
];

const ALLOW = ["/", "/home", "/wallet", "/trades", "/profits", "/settings"];

test("suppress paths hide install and push", () => {
  for (const pathname of SUPPRESS) {
    assert.equal(shouldSuppressPwaChrome(pathname), true, pathname);
    assert.equal(isInstallOverlayAllowed(pathname), false, pathname);
    assert.equal(
      isPushOverlayAllowed({
        pathname,
        serverPushEnabled: true,
        clientHintDisabled: false,
      }),
      false,
      pathname,
    );
  }
});

test("normal paths are not suppressed", () => {
  for (const pathname of ALLOW) {
    assert.equal(shouldSuppressPwaChrome(pathname), false, pathname);
    assert.equal(isInstallOverlayAllowed(pathname), true, pathname);
  }
});

test("non-true server PUSH_ENABLED hides push overlay", () => {
  assert.equal(
    isPushOverlayAllowed({
      pathname: "/",
      serverPushEnabled: null,
      clientHintDisabled: false,
    }),
    false,
  );
  assert.equal(
    isPushOverlayAllowed({
      pathname: "/",
      serverPushEnabled: false,
      clientHintDisabled: false,
    }),
    false,
  );
  assert.equal(
    isPushOverlayAllowed({
      pathname: "/",
      serverPushEnabled: true,
      clientHintDisabled: false,
    }),
    true,
  );
});

test("install overlay stays allowed on non-suppress paths", () => {
  assert.equal(isInstallOverlayAllowed("/"), true);
});

test("NEXT_PUBLIC_PUSH_ENABLED false is extra hide", () => {
  assert.equal(clientPushHintDisabled({ NEXT_PUBLIC_PUSH_ENABLED: "false" }), true);
  assert.equal(clientPushHintDisabled({ NEXT_PUBLIC_PUSH_ENABLED: "true" }), false);
  assert.equal(clientPushHintDisabled({}), false);
  assert.equal(
    isPushOverlayAllowed({
      pathname: "/",
      serverPushEnabled: true,
      clientHintDisabled: true,
    }),
    false,
  );
});
