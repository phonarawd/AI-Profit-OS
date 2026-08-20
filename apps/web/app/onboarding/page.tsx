import { PendingFigma } from "@/app/PendingFigma";
import { GuestChrome } from "@/app/components/GuestChrome";
import { OnboardingClient } from "./OnboardingClient";

export default function Page() {
  return (
    <GuestChrome>
      <PendingFigma title="시작" />
      <OnboardingClient />
    </GuestChrome>
  );
}
