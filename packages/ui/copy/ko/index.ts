import { execution } from "./execution";
import { opportunity } from "./opportunity";

/** 유저·어드민 화면 카피 SSOT 루트 (`T.*`) */
export const T = {
  execution,
  opportunity,
} as const;

export type CopyRoot = typeof T;
export { execution, opportunity };
