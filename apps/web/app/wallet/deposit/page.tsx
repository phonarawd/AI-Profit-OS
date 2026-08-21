import { DepositClient } from "./DepositClient";

/** DepositConsult + TaxDisclaimerBlock are mounted inside DepositClient. live-wire: GET /api/v1/wallet/my-deposit-address · trc20Address · deposit-address-copy */
export default function Page() {
  return <DepositClient />;
}
