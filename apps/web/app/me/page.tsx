import { PendingFigma } from "@/app/PendingFigma";
import { ProfileClient } from "./ProfileClient";

export default function Page() {
  return (
    <>
      <PendingFigma title="내정보" />
      <ProfileClient />
    </>
  );
}
