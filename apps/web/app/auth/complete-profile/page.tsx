import { GuestChrome } from "../../components/GuestChrome";
import { CompleteProfileRuntime } from "./CompleteProfileRuntime";

/** Canon auth-complete-profile · Stage B */
export default function AuthCompleteProfilePage() {
  return (
    <GuestChrome layout="viewport">
      <CompleteProfileRuntime />
    </GuestChrome>
  );
}
