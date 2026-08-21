import { TradeExecuteClient } from "./TradeExecuteClient";

/** live-wire: useTradeExecution 는 TradeExecuteClient 가 호출한다. */

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TradeExecuteClient tradeId={id} />;
}
