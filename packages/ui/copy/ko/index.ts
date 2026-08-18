import { admin } from "./admin";
import { common } from "./common";
import { practice } from "./practice";
import {
  principalGuide,
  principalProfit,
  successBucketCta,
  walletBuckets,
  withdrawMode,
} from "./principal-profit";
import { trust } from "./trust";

export const T = {
  admin,
  common,
  practice,
  trust,
  walletBuckets,
  withdrawMode,
  successBucketCta,
  principalGuide,
  principalProfit,
} as const;

export type CopyRoot = typeof T;
export {
  admin,
  common,
  practice,
  principalGuide,
  principalProfit,
  successBucketCta,
  trust,
  walletBuckets,
  withdrawMode,
};
