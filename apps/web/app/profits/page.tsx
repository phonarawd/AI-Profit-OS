"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";

/** PART5b /profits shell — feed depth = PART3 */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="profits-shell">
      <h1 className="text-xl font-semibold">{T.user.profits.title}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">{T.user.profits.subtitle}</p>
      <p className="mt-6 text-sm" role="status">
        {T.user.empty.opportunities}
      </p>
      <Link
        href="/wallet/deposit"
        className="mt-4 inline-block text-sm text-lux-accent underline"
      >
        {T.user.empty.opportunitiesCta}
      </Link>
    </main>
  );
}
