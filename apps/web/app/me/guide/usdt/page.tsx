import { PendingFigma } from "@/app/PendingFigma";
import { GuideLinks } from "../../GuideLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="테더 안내" />
      <section data-account-hub="guides">
        <p>테더는 이 서비스에서 쓰는 돈 단위예요.</p>
        <GuideLinks />
      </section>
    </>
  );
}
