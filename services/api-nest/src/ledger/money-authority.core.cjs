/**
 * 금액 권위 구분. 예상액·설정 지급액을 원장 완료로 쓰지 않는다.
 * 클라이언트 계산값은 payoutAuthoritative 가 될 수 없다.
 */
"use strict";

function projectMoneyAuthority(input) {
  const expected =
    input && input.expectedProfitUsdt != null && input.expectedProfitUsdt !== ""
      ? String(input.expectedProfitUsdt)
      : null;
  const configured =
    input && input.configuredPayoutUsdt != null && input.configuredPayoutUsdt !== ""
      ? String(input.configuredPayoutUsdt)
      : null;
  const journalId =
    input && input.ledgerJournalId != null && input.ledgerJournalId !== ""
      ? String(input.ledgerJournalId)
      : null;
  const paidRaw =
    input && input.ledgerPaidUsdt != null && input.ledgerPaidUsdt !== ""
      ? String(input.ledgerPaidUsdt)
      : null;
  const clientClaim = input && input.clientComputedUsdt != null;
  const ledgerPaidUsdt = journalId && paidRaw ? paidRaw : null;
  return {
    expectedProfitUsdt: expected,
    configuredPayoutUsdt: configured,
    ledgerPaidUsdt,
    ledgerJournalId: journalId,
    payoutAuthoritative: Boolean(journalId && ledgerPaidUsdt) && !clientClaim,
    clientComputedNotAuthority: true,
  };
}

function rejectClientPayoutAuthority(input) {
  if (input && (input.clientComputedUsdt != null || input.clientPayoutAmount != null)) {
    return {
      ok: false,
      applied: false,
      code: "CLIENT_PAYOUT_NOT_AUTHORITY",
      httpStatus: 400,
    };
  }
  return null;
}

module.exports = {
  projectMoneyAuthority,
  rejectClientPayoutAuthority,
};
