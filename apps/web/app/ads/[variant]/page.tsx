import { PendingFigma } from "@/app/PendingFigma";
import { GuestChrome } from "@/app/components/GuestChrome";
import { PublicAdSurface } from "../../l/PublicAdSurface";

export default function Page() {
  return (
    <GuestChrome>
      <PendingFigma title="퍼뜩" />
      <PublicAdSurface />
    </GuestChrome>
  );
}
