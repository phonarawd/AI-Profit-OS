"use client";

import { PremiumEmptyState, PremiumSurface } from "../../../components/putduk-premium";
import { AccountFrame } from "../AccountFrame";

const TITLE = "\uC774\uBCA4\uD2B8";
const EMPTY_TITLE = "\uC9C0\uAE08 \uBCFC \uC774\uBCA4\uD2B8\uAC00 \uC5C6\uC5B4\uC694";
const EMPTY_BODY = "\uC9C0\uAE08\uC740 \uD655\uC778\uD560 \uC218 \uC788\uB294 \uC774\uBCA4\uD2B8\uAC00 \uC5C6\uC5B4\uC694.";

export default function Page() {
  return (
    <AccountFrame title={TITLE} view="ready" testId="events-page">
      <PremiumSurface>
        <PremiumEmptyState title={EMPTY_TITLE} description={EMPTY_BODY} />
      </PremiumSurface>
    </AccountFrame>
  );
}
