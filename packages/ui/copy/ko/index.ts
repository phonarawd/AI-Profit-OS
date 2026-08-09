import { deposit } from "./deposit";
import { execution } from "./execution";
import { invite } from "./invite";
import { kyc } from "./kyc";
import { opportunity } from "./opportunity";
import { practice } from "./practice";
import {
  principalGuide,
  principalProfit,
  successBucketCta,
  walletBuckets,
  withdrawMode,
} from "./principal-profit";
import { wallet } from "./wallet";

/** 유저·어드민 화면 카피 SSOT 루트 (`T.*`) */
export const T = {
  deposit,
  execution,
  invite,
  kyc,
  opportunity,
  practice,
  wallet,
  walletBuckets,
  withdrawMode,
  successBucketCta,
  principalGuide,
  principalProfit,
} as const;

export type CopyRoot = typeof T;
export {
  deposit,
  execution,
  invite,
  kyc,
  opportunity,
  practice,
  principalGuide,
  principalProfit,
  successBucketCta,
  wallet,
  walletBuckets,
  withdrawMode,
};
