"use client";

import { T } from "@aipo/ui/copy/ko";

/** PART5c wallet history shell — virtualization when >30 rows (PART8) */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="wallet-history">
      <h1 className="text-xl font-semibold">{T.user.walletHistory.title}</h1>
      <p className="mt-6 text-sm" role="status">
        {T.user.empty.walletHistory}
      </p>
    </main>
  );
}
