import { Suspense } from "react";
import { GuestChrome } from "../../components/GuestChrome";
import { MagicLinkRuntime } from "./MagicLinkRuntime";

export default function MagicLinkPage() {
  return (
    <GuestChrome>
      <Suspense fallback={<p role="status">로그인 링크를 확인하고 있어요.</p>}>
        <MagicLinkRuntime />
      </Suspense>
    </GuestChrome>
  );
}
