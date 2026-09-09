/**
 * 유저 화면 숫자 위계 — 원화가 큰 숫자, USDT는 보조.
 * 장부·참여·정산 SoT는 계속 USDT. 환율 없으면 KRW는 null (0 위조 금지).
 */

export const USER_MONEY_DISPLAY_PRIMARY = "KRW" as const;
export const USER_MONEY_DISPLAY_SECONDARY = "USDT" as const;

export type UserMoneyDisplay = {
  displayPrimary: typeof USER_MONEY_DISPLAY_PRIMARY;
  displaySecondary: typeof USER_MONEY_DISPLAY_SECONDARY;
};

export function userMoneyDisplay(): UserMoneyDisplay {
  return {
    displayPrimary: USER_MONEY_DISPLAY_PRIMARY,
    displaySecondary: USER_MONEY_DISPLAY_SECONDARY,
  };
}
