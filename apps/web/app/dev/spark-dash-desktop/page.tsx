import { notFound } from "next/navigation";
import { HomeDesktop } from "../../../components/spark-dash-home/HomeDesktop";
import { SPARK_DASH_DESKTOP_VISUAL_FIXTURE } from "../../../components/spark-dash-home/visual-fixture";

export default function SparkDashDesktopPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HomeDesktop model={SPARK_DASH_DESKTOP_VISUAL_FIXTURE} />;
}
