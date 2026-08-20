import { PendingFigma } from "@/app/PendingFigma";
import { LegalLinks } from "../LegalLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="약관과 정보" />
      <section data-account-hub="legal">
        <LegalLinks />
      </section>
    </>
  );
}
