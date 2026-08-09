"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";

const LINKS = [
  { href: "/me/benefits", label: () => T.user.me.benefits },
  { href: "/me/peotteok", label: () => T.user.me.peotteok },
  { href: "/me/membership", label: () => T.user.me.membership },
  { href: "/me/inbox", label: () => T.user.me.inbox },
  { href: "/me/invite", label: () => T.user.me.invite },
  { href: "/me/events", label: () => T.user.me.events },
  { href: "/me/strategies", label: () => T.user.me.strategies },
  { href: "/me/kyc", label: () => T.user.me.kyc },
  { href: "/me/guide/partners", label: () => T.user.me.guidePartners },
  { href: "/me/support", label: () => T.user.me.support },
  { href: "/me/settings", label: () => T.user.me.settings },
  { href: "/me/legal", label: () => T.user.me.legal },
] as const;

/** PART5b /me hub — nested routes locked in USER_NESTED_ROUTES */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="me-hub">
      <h1 className="text-xl font-semibold">{T.user.me.title}</h1>
      <ul className="mt-6 space-y-2">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="touch-target flex items-center rounded-lux-md border border-lux-border px-4 py-3 text-sm"
            >
              {item.label()}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
