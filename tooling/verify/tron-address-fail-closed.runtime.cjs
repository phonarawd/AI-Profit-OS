"use strict";

const assert = require("node:assert/strict");
const {
  TRON_HD_DERIVATION_UNAVAILABLE,
  TronHdDerivationUnavailableError,
  deriveTrc20Address,
} = require("../../services/api-nest/dist/wallet/tron-address.js");

assert.equal(
  TRON_HD_DERIVATION_UNAVAILABLE,
  "TRON_HD_DERIVATION_UNAVAILABLE",
);

assert.throws(
  () =>
    deriveTrc20Address({
      secretRef: "ops:vault:hot-wallet-xpub",
      derivationIndex: 0,
    }),
  (err) =>
    err instanceof TronHdDerivationUnavailableError &&
    err.code === TRON_HD_DERIVATION_UNAVAILABLE,
);

assert.throws(
  () => deriveTrc20Address({ secretRef: "", derivationIndex: 0 }),
  /hotWalletXpubRef required/,
);

assert.throws(
  () =>
    deriveTrc20Address({
      secretRef: "ops:vault:hot-wallet-xpub",
      derivationIndex: -1,
    }),
  /derivationIndex/,
);

console.log(
  "[verify:tron-address-runtime] PASS (VALID_REFERENCE_FAILS_CLOSED · NO_FAKE_SPENDABILITY)",
);
