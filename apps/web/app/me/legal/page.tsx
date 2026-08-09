"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";

/** UI §50.9 — /me/legal */
export default function Page() {
  return (
    <main className="p-6 text-lux-text">
      <h1 className="text-xl font-semibold">약관</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        {T.operator.legal.body}
      </p>
      <p className="mt-3 text-sm text-lux-text-muted">
        {T.operator.legal.licenseLine}
      </p>
      <p className="mt-2 text-sm text-lux-text-muted">
        {T.operator.legal.activityLine}
      </p>
      <Link
        href="/me/legal/license"
        className="mt-6 inline-block text-sm text-lux-accent underline"
      >
        {T.operator.license.pageTitle}
      </Link>
    </main>
  );
}
