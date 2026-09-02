import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocateCanonicalTrc20Address,
  createXpubTrc20Deriver,
  deriveTrc20Address,
  requireCanonicalTrc20Deriver,
  resolveCanonicalTrc20Deriver,
  TRON_HD_DERIVATION_UNAVAILABLE,
  TRON_HD_PATH_PREFIX,
  TronHdDerivationUnavailableError,
} from "./tron-address.ts";
import {
  classifyDepositAddressAuthority,
  LEGACY_SYNTHETIC_QUARANTINE,
} from "./tron-address-quarantine.ts";

const TEST_XPUB =
  "xpub6D1AabNHCupeiLM65ZR9UStMhJ1vCpyV4XbZdyhMZBiJXALQtmn9p42VTQckoHVn8WNqS7dqnJokZHAHcHGoaQgmv8D45oNUKx6DZMNZBCd";
const EXPECTED = [
  "TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH",
  "TSeJkUh4Qv67VNFwY8LaAxERygNdy6NQZK",
  "TYJPRrdB5APNeRs4R7fYZSwW3TcrTKw2gx",
] as const;

test("without TRON_HOT_WALLET_XPUB deriver is null (fail-closed)", () => {
  assert.equal(resolveCanonicalTrc20Deriver({}), null);
  assert.throws(
    () => requireCanonicalTrc20Deriver({}),
    (err: unknown) =>
      err instanceof TronHdDerivationUnavailableError &&
      err.code === TRON_HD_DERIVATION_UNAVAILABLE &&
      err.status === 503,
  );
});

test("secret-ref hashing cannot mint a spendable address", () => {
  const prev = process.env.TRON_HOT_WALLET_XPUB;
  delete process.env.TRON_HOT_WALLET_XPUB;
  try {
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
  } finally {
    if (prev === undefined) delete process.env.TRON_HOT_WALLET_XPUB;
    else process.env.TRON_HOT_WALLET_XPUB = prev;
  }
});

test("persist/INSERT is not called when canonical deriver is missing", () => {
  const prev = process.env.TRON_HOT_WALLET_XPUB;
  delete process.env.TRON_HOT_WALLET_XPUB;
  let persistCalls = 0;
  try {
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
        err instanceof TronHdDerivationUnavailableError && err.status === 503,
    );
    assert.equal(persistCalls, 0);
  } finally {
    if (prev === undefined) delete process.env.TRON_HOT_WALLET_XPUB;
    else process.env.TRON_HOT_WALLET_XPUB = prev;
  }
});

test("xpub deriver locks HD path and unique per-index addresses", () => {
  const deriver = createXpubTrc20Deriver(TEST_XPUB);
  const a0 = deriver.derive({ derivationIndex: 0 });
  const a1 = deriver.derive({ derivationIndex: 1 });
  const a2 = deriver.derive({ derivationIndex: 2 });
  assert.equal(a0.trc20Address, EXPECTED[0]);
  assert.equal(a1.trc20Address, EXPECTED[1]);
  assert.equal(a2.trc20Address, EXPECTED[2]);
  assert.notEqual(a0.trc20Address, a1.trc20Address);
  assert.equal(a0.hdPath, `${TRON_HD_PATH_PREFIX}0`);
});

test("env-bound deriver survives restart-equivalent re-resolve", () => {
  const first = requireCanonicalTrc20Deriver({
    TRON_HOT_WALLET_XPUB: TEST_XPUB,
  }).derive({ derivationIndex: 0 });
  const second = requireCanonicalTrc20Deriver({
    TRON_HOT_WALLET_XPUB: TEST_XPUB,
  }).derive({ derivationIndex: 0 });
  assert.equal(first.trc20Address, second.trc20Address);
  assert.equal(first.trc20Address, EXPECTED[0]);
});

test("legacy synthetic address is quarantined", () => {
  const deriver = createXpubTrc20Deriver(TEST_XPUB);
  const cls = classifyDepositAddressAuthority({
    deriver,
    trc20Address: "TLegacySyntheticFakeAddress000000001",
    derivationIndex: 0,
  });
  assert.equal(cls.authority, "quarantined_legacy");
  assert.equal(cls.reason, LEGACY_SYNTHETIC_QUARANTINE);
});
