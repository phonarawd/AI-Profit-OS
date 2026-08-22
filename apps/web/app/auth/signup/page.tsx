import { GuestChrome } from "../../components/GuestChrome";
import { SignupRuntime } from "./SignupRuntime";

/** Canon auth-signup · Stage A */
export default function AuthSignupPage() {
  return (
    <GuestChrome layout="viewport">
      <SignupRuntime />
    </GuestChrome>
  );
}
