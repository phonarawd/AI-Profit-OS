import type { ReactNode } from "react";
import { AppShellRoot } from "@aipo/ui/components/shell";
import { USER_TABS } from "../routes";

/**
 * REL-105: leftover 5-tab chrome, scoped only.
 * Root layout must not mount this. / and /dev and the core loop must not inherit it.
 */
export function LegacyAppShell({ children }: { children: ReactNode }) {
  return <AppShellRoot tabs={USER_TABS}>{children}</AppShellRoot>;
}
