import { DepositConsult } from "@aipo/ui/components/trust/DepositConsult";
import { TaxDisclaimerBlock } from "@aipo/ui/components/trust/TaxDisclaimerBlock";
import { DepositClient } from "./DepositClient";

/** live-wire: GET /api/v1/wallet/my-deposit-address · trc20Address · deposit-address-copy */
export default function Page() {
  return (
    <>
      <DepositConsult />
      <TaxDisclaimerBlock />
      <DepositClient />
    </>
  );
}
