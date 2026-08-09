"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";

/** UI §50.3 / §50.9 — legal hub */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="legal-hub">
      <h1 className="text-xl font-semibold">{T.legal.hubTitle}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">{T.operator.legal.body}</p>
      <p className="mt-3 text-sm text-lux-text-muted">{T.operator.legal.licenseLine}</p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link href="/me/legal/terms" className="text-lux-accent underline">
            {T.legal.termsTitle}
          </Link>
        </li>
        <li>
          <Link href="/me/legal/privacy" className="text-lux-accent underline">
            {T.legal.privacyTitle}
          </Link>
        </li>
        <li>
          <Link href="/me/legal/oss" className="text-lux-accent underline">
            {T.legal.ossTitle}
          </Link>
        </li>
        <li>
          <Link href="/me/legal/license" className="text-lux-accent underline">
            {T.legal.licenseTitle}
          </Link>
        </li>
      </ul>
    </main>
  );
}
