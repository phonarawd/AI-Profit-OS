import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocateCanonicalTrc20Address,
  deriveTrc20Address,
  requireCanonicalTrc20Deriver,
  resolveCanonicalTrc20Deriver,
  TRON_HD_DERIVATION_UNAVAILABLE,
  TronHdDerivationUnavailableError,
} from "./tron-address.ts";

test("no approved BIP32 deriver is bound", () => {
  assert.equal(resolveCanonicalTrc20Deriver(), null);
});

test("requireCanonicalTrc20Deriver is 503 fail-closed", () => {
  assert.throws(
    () => requireCanonicalTrc20Deriver(),
    (err: unknown) =>
      err instanceof TronHdDerivationUnavailableError &&
      err.code === TRON_HD_DERIVATION_UNAVAILABLE &&
      err.status === 503,
  );
});

test("secret-ref hashing cannot mint a spendable address", () => {
  assert.throws(
    () =>
      deriveTrc20Address({
        secretRef: "secret:hot-wallet-xpub",
        derivationIndex: 0,
      }),
    (err: unknown) =>
      err instanceof TronHdDerivationUnavailableError &&
      err.message === TRON_HD_DERIVATION_UNAVAILABLE,
  );
});

test("persist/INSERT is not called when canonical deriver is missing", () => {
  let persistCalls = 0;
  assert.throws(
    () =>
      allocateCanonicalTrc20Address({
        derivationIndex: 0,
        persist: () => {
          persistCalls += 1;
          return "inserted";
        },
      }),
    (err: unknown) =>
      err instanceof TronHdDerivationUnavailableError &&
      err.status === 503,
  );
  assert.equal(persistCalls, 0);
});
