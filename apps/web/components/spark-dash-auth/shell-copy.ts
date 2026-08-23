import { T } from "@aipo/ui/copy/ko";
import type { AuthShellVariant } from "./types";

/** Spark Dash AuthShell brand panel — T.authShell notes · emoji-stripped headlines */
export function authShellCopy(variant: AuthShellVariant) {
  if (variant === "signup") {
    return {
      title: "퍼뜩 시작하기",
      sub: T.auth.signupSub,
      note: T.authShell.signupBrandNote,
    };
  }
  if (variant === "complete-profile") {
    return {
      title: T.auth.completeHeadline.replace(/\p{Extended_Pictographic}/gu, "").trim(),
      sub: T.auth.completeSub,
      note: T.authShell.completeBrandNote,
    };
  }
  return {
    title: "다시 오신 걸 환영해요",
    sub: T.auth.loginSub,
    note: T.authShell.loginBrandNote,
  };
}
