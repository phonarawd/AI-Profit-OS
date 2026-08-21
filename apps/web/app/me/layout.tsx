import type { ReactNode } from "react";
import { LegacyAppShell } from "../LegacyAppShell";

export default function MeLayout({ children }: { children: ReactNode }) {
  return <LegacyAppShell>{children}</LegacyAppShell>;
}
