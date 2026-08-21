import { SettlementClient } from "./SettlementClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SettlementClient tradeId={id} />;
}
