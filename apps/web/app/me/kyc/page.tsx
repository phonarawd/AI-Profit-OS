import { PendingFigma } from "@/app/PendingFigma";
import { KycClient } from "./KycClient";

export default function Page() {
  return (
    <>
      <PendingFigma title="본인 확인" />
      <KycClient />
    </>
  );
}
