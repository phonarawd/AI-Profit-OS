import { PendingFigma } from "@/app/PendingFigma";
import { GuestChrome } from "@/app/components/GuestChrome";
import { SignupClient } from "./SignupClient";

export default function Page() {
  return (
    <GuestChrome>
      <PendingFigma title="가입" />
      <SignupClient />
    </GuestChrome>
  );
}
