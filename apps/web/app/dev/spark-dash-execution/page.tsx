import { notFound } from "next/navigation";
import { SparkDashExecutionPreviewClient } from "./SparkDashExecutionPreviewClient";
import "./preview.css";

export default function SparkDashExecutionPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SparkDashExecutionPreviewClient />;
}
