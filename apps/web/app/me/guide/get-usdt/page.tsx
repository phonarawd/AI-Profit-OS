"use client";

import { GetUsdtGuide } from "@aipo/ui/components/trust";
import { GuidePage } from "../GuidePage";

export default function Page() {
  return (
    <GuidePage title={"\uD14C\uB354 \uC900\uBE44"} testId="guide-get-usdt-page">
      <div data-canon="get-usdt-guide">
        <GetUsdtGuide />
      </div>
    </GuidePage>
  );
}
