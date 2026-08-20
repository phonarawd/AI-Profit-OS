import { notFound } from "next/navigation";
import { HomeMobile } from "../../../components/spark-dash-home/HomeMobile";
import { SPARK_DASH_DESKTOP_VISUAL_FIXTURE } from "../../../components/spark-dash-home/visual-fixture";

export default function SparkDashMobilePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HomeMobile model={SPARK_DASH_DESKTOP_VISUAL_FIXTURE} />;
}
