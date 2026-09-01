/**
 * 유저 KRW 입금 안내 투영.
 * Admin deposit-config 전체·비밀 ref·수수료·가드를 노출하지 않는다.
 */

export type SafeKrwDepositInstructions = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  noticeKo: string;
};

export function projectSafeKrwDepositInstructions(cfg: {
  krw: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    noticeKo: string;
  };
}): SafeKrwDepositInstructions {
  const bankName = cfg.krw.bankName.trim();
  const accountNumber = cfg.krw.accountNumber.trim();
  const accountHolder = cfg.krw.accountHolder.trim();
  if (!bankName || !accountNumber || !accountHolder) {
    throw new Error("CONFIG_NOT_READY");
  }
  if (typeof cfg.krw.noticeKo !== "string") {
    throw new Error("CONFIG_NOT_READY");
  }
  return {
    bankName,
    accountNumber,
    accountHolder,
    noticeKo: cfg.krw.noticeKo,
  };
}
