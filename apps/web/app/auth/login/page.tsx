import { PendingFigma } from "@/app/PendingFigma";
import { GuestChrome } from "@/app/components/GuestChrome";
import { LoginClient } from "./LoginClient";

export default function Page() {
  return (
    <GuestChrome>
      <PendingFigma title="로그인" />
      <LoginClient />
    </GuestChrome>
  );
}
