import { PendingFigma } from "@/app/PendingFigma";
import operator from "@aipo/operator-entity";
import { LegalLinks } from "../../LegalLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="라이선스" />
      <section data-account-hub="legal">
        <p>{operator.legalName}</p>
        <p>
          {operator.issuingAuthority} {operator.licenseNumber}
        </p>
        <LegalLinks />
      </section>
    </>
  );
}
