import { admin } from "./admin";
import { auth } from "./auth";
import { brand } from "./brand";
import { common } from "./common";
import { deposit } from "./deposit";
import {
  CUTE_EMOJI_ALLOWED,
  CUTE_EMOJI_FORBIDDEN,
  EMOJI_CAPS,
} from "./emoji";
import { execution } from "./execution";
import { feed } from "./feed";
import { guide } from "./guide";
import { invite } from "./invite";
import { kyc } from "./kyc";
import { landing } from "./landing";
import { legal } from "./legal";
import { margin } from "./margin";
import { objections } from "./objections";
import { onboarding } from "./onboarding";
import { operator } from "./operator";
import { opportunity } from "./opportunity";
import { peotteok } from "./peotteok";
import { practice } from "./practice";
import {
  principalGuide,
  principalProfit,
  successBucketCta,
  walletBuckets,
  withdrawMode,
} from "./principal-profit";
import { settings } from "./settings";
import { ticker } from "./ticker";
import { toast } from "./toast";
import { trust } from "./trust";
import { user } from "./user";
import { wallet } from "./wallet";

/** 유저·어드민 화면 카피 SSOT 루트 (`T.*`) */
export const T = {
  admin,
  auth,
  brand,
  common,
  deposit,
  execution,
  feed,
  guide,
  invite,
  kyc,
  landing,
  legal,
  margin,
  objections,
  onboarding,
  operator,
  opportunity,
  peotteok,
  practice,
  settings,
  ticker,
  toast,
  trust,
  user,
  wallet,
  walletBuckets,
  withdrawMode,
  successBucketCta,
  principalGuide,
  principalProfit,
} as const;

export type CopyRoot = typeof T;
export {
  admin,
  auth,
  brand,
  common,
  CUTE_EMOJI_ALLOWED,
  CUTE_EMOJI_FORBIDDEN,
  deposit,
  EMOJI_CAPS,
  execution,
  feed,
  guide,
  invite,
  kyc,
  landing,
  legal,
  margin,
  objections,
  onboarding,
  operator,
  opportunity,
  peotteok,
  practice,
  principalGuide,
  principalProfit,
  settings,
  successBucketCta,
  ticker,
  toast,
  trust,
  user,
  wallet,
  walletBuckets,
  withdrawMode,
};
