import type { ReactNode } from "react";
import { LegacyAppShell } from "../LegacyAppShell";

export default function WalletLayout({ children }: { children: ReactNode }) {
  return <LegacyAppShell>{children}</LegacyAppShell>;
}
