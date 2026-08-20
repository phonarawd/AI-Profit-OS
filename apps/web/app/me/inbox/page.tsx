import { PendingFigma } from "@/app/PendingFigma";
import { InboxClient } from "./InboxClient";

export default function Page() {
  return (
    <>
      <PendingFigma title="알림" />
      <InboxClient />
    </>
  );
}
