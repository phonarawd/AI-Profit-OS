import { OnboardingFlow } from "@aipo/ui/components/onboarding";
import { GuestChrome } from "../components/GuestChrome";
import styles from "./onboarding-premium.module.css";

/** Canon onboarding-identity · onboarding-demo-card · §6.4 experiential */
export default function OnboardingPage() {
  return (
    <GuestChrome>
      <div className={styles.shell}>
        <OnboardingFlow />
      </div>
    </GuestChrome>
  );
}
