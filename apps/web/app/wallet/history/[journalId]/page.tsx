import { HistoryDetailClient } from "./HistoryDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ journalId: string }>;
}) {
  const { journalId } = await params;
  return <HistoryDetailClient journalId={journalId} />;
}
