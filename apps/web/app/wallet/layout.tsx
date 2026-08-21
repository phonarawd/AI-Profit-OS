import type { ReactNode } from "react";

/** REL-113 — no leftover 5-tab chrome. /wallet is its own surface. */
export default function WalletLayout({ children }: { children: ReactNode }) {
  return children;
}
