import { OnboardingFlow } from "@aipo/ui/components/onboarding";
import { GuestChrome } from "../components/GuestChrome";

/** Canon onboarding-identity · onboarding-demo-card · §6.4 experiential */
export default function OnboardingPage() {
  return (
    <GuestChrome>
      <OnboardingFlow />
    </GuestChrome>
  );
}
