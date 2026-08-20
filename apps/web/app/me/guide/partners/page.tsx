import { PendingFigma } from "@/app/PendingFigma";
import { GuideLinks } from "../../GuideLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="협력" />
      <section data-account-hub="guides">
        <p>공식 협력은 eBay, Amazon, Yahoo! JAPAN Auction이에요.</p>
        <p>거래소 조작을 가르치지 않아요.</p>
        <p>연결이 잠시 없어도 공식 협력은 그대로예요.</p>
        <GuideLinks />
      </section>
    </>
  );
}
