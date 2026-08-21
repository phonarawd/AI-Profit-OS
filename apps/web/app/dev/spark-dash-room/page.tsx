import { notFound } from "next/navigation";
import { SparkDashRoomPreviewClient } from "./SparkDashRoomPreviewClient";
import "../../../components/spark-dash-home/spark-dash-home.css";

export default async function SparkDashRoomPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <SparkDashRoomPreviewClient sheet={params.sheet} />;
}
