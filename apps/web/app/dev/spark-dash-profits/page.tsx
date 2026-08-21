import { notFound } from "next/navigation";
import "../../../components/spark-dash-home/spark-dash-home.css";
import { SparkDashProfitsPreviewClient } from "./SparkDashProfitsPreviewClient";

export default function SparkDashProfitsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SparkDashProfitsPreviewClient />;
}
