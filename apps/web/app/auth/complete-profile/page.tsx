import { PendingFigma } from "@/app/PendingFigma";
import { GuestChrome } from "@/app/components/GuestChrome";
import { CompleteProfileClient } from "./CompleteProfileClient";

export default function Page() {
  return (
    <GuestChrome>
      <PendingFigma title="프로필" />
      <CompleteProfileClient />
    </GuestChrome>
  );
}
