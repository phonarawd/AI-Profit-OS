import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyKrwInstructionsHttp,
  parseSafeKrwDepositInstructions,
} from "./krw-deposit-instructions.ts";

const VALID = {
  bankName: "QA Bank",
  accountNumber: "QA-000",
  accountHolder: "Peotteok",
  noticeKo: "qa-notice",
};

test("valid four-field payload is ready", () => {
  assert.deepEqual(parseSafeKrwDepositInstructions(VALID), VALID);
});

test("empty noticeKo is allowed", () => {
  assert.deepEqual(parseSafeKrwDepositInstructions({ ...VALID, noticeKo: "" }), {
    ...VALID,
    noticeKo: "",
  });
});

test("malformed authority is unavailable", () => {
  assert.equal(parseSafeKrwDepositInstructions({}), null);
  assert.equal(parseSafeKrwDepositInstructions(null), null);
  assert.equal(parseSafeKrwDepositInstructions({ bankName: "QA Bank" }), null);
  assert.equal(
    parseSafeKrwDepositInstructions({ ...VALID, bankName: "   " }),
    null,
  );
  assert.equal(
    parseSafeKrwDepositInstructions({ ...VALID, noticeKo: null }),
    null,
  );
  assert.equal(
    parseSafeKrwDepositInstructions({ ...VALID, accountNumber: 1 }),
    null,
  );
});

test("leaked admin fields fail closed", () => {
  assert.equal(
    parseSafeKrwDepositInstructions({ ...VALID, hotWalletXpubRef: "x" }),
    null,
  );
  assert.equal(
    parseSafeKrwDepositInstructions({ ...VALID, krwWithdrawFeeKrw: 0 }),
    null,
  );
});

test("http classification", () => {
  assert.equal(classifyKrwInstructionsHttp(401), "unauthorized");
  assert.equal(classifyKrwInstructionsHttp(403), "unauthorized");
  assert.equal(classifyKrwInstructionsHttp(500), "unavailable");
  assert.equal(classifyKrwInstructionsHttp(503), "unavailable");
});
