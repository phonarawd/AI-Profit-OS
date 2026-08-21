import { OnboardingFlow } from "@aipo/ui/components/onboarding";
import { GuestChrome } from "../components/GuestChrome";

/** Automation Story 7단 · Figma 237:1813 / 237:2155 */
export default function OnboardingPage() {
  return (
    <GuestChrome layout="viewport">
      <OnboardingFlow />
    </GuestChrome>
  );
}
