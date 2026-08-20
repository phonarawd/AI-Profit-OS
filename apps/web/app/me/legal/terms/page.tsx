import { PendingFigma } from "@/app/PendingFigma";
import { LegalLinks } from "../../LegalLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="이용약관" />
      <section data-account-hub="legal">
        <LegalLinks />
      </section>
    </>
  );
}
