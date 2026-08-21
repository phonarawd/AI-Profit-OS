import "../../../components/spark-dash-home/spark-dash-home.css";
import "../../../components/spark-dash-profits/spark-dash-profits.css";
import { OpportunityDetailClient } from "./OpportunityDetailClient";

/** live-wire: fetchOpportunityDetail 는 OpportunityDetailClient 가 호출한다. */

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OpportunityDetailClient opportunityId={id} />;
}
