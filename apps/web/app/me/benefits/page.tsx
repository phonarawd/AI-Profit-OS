"use client";

import { T } from "@aipo/ui/copy/ko";

/**
 * Route lock PART5b — deep Benefit Hub = PART7b Owns.
 * Skeleton only so USER_NESTED_ROUTES /me/benefits resolves.
 */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="benefits-shell">
      <h1 className="text-xl font-semibold">{T.user.me.benefits}</h1>
      <p className="mt-6 text-sm" role="status">
        {T.user.empty.benefits}
      </p>
    </main>
  );
}
